/*!
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

/**
 * This file registers the Overlay row action on the pages report.
 */

(function () {
    
    var actionName = 'SegmentVisitorLog';

    function getDataTableFromApiMethod(apiMethod)
    {
        var div = $(require('piwik/UI').DataTable.getDataTableByReport(apiMethod));
        if (div.size() > 0 && div.data('uiControlObject')) {
            return div.data('uiControlObject');
        }
    }

    function getMetadataFromDataTable(dataTable)
    {
        if (dataTable) {

            return dataTable.getReportMetadata();
        }
    }

    function getDimensionFromApiMethod(apiMethod)
    {
        if (!apiMethod) {
            return;
        }

        var dataTable = getDataTableFromApiMethod(apiMethod);
        var metadata  = getMetadataFromDataTable(dataTable);

        if (metadata && metadata.dimension) {
            return metadata.dimension;
        }
    }

    function getSegmentsFromDataTable(dataTable)
    {
        var metadata = getMetadataFromDataTable(dataTable);

        if (metadata && $.isPlainObject(metadata.segments))
        {
            return metadata.segments;
        }
    }

    function getFirstSegmentFromDataTable(dataTable)
    {
        var segments = getSegmentsFromDataTable(dataTable);

        if (segments)
        {
            for (var segmentName in segments) {
                return segmentName;
            }
        }
    }

    function getNameOfSegmentFromDataTable(dataTable, segmentName)
    {
        var segments = getSegmentsFromDataTable(dataTable);

        if (segments && segments[segmentName])
        {
            return segments[segmentName];
        }

        return segmentName;
    }

    function DataTable_RowActions_SegmentVisitorLog(dataTable) {
        this.dataTable = dataTable;
        this.actionName = actionName;

        // has to be overridden in subclasses
        this.trEventName = 'piwikTriggerSegmentVisitorLogAction';

        // TODO we need to use == instead of =@ (contains) as soon as we have the actual value available for segmentation
        this.segmentComparison = '=@';
        this.segment = getFirstSegmentFromDataTable(dataTable);
    }

    DataTable_RowActions_SegmentVisitorLog.prototype = new DataTable_RowAction();

    DataTable_RowActions_SegmentVisitorLog.prototype.openPopover = function (apiMethod, segment, extraParams) {
        var urlParam = apiMethod + ':' + segment + ':' + encodeURIComponent(JSON.stringify(extraParams));

        broadcast.propagateNewPopoverParameter('RowAction', actionName + ':' + urlParam);
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.performAction = function (label, tr, e) {

        if ('@' === (label+'').substr(0, 1)) {
            label = (label+'').substr(1);
        }

        var apiMethod = this.dataTable.param.module + '.' + this.dataTable.param.action;
        var segment   = this.segment + this.segmentComparison + label;

        this.openPopover(apiMethod, segment, {});
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.doOpenPopover = function (urlParam) {
        var urlParamParts = urlParam.split(':');

        var apiMethod = urlParamParts.shift();
        var segment = urlParamParts.shift();

        var extraParamsString = urlParamParts.shift(),
            extraParams = {}; // 0/1 or "0"/"1"

        try {
            extraParams = JSON.parse(decodeURIComponent(extraParamsString));
        } catch (e) {
            // assume the parameter is an int/string describing whether to use multi row evolution
        }

        this.showVisitorLog(apiMethod, segment, extraParams);
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.showVisitorLog = function (apiMethod, segment, extraParams) {

        var self = this;

        // open the popover
        var box = Piwik_Popover.showLoading('Segmented Visitor Log');
        box.addClass('segmentedVisitorLogPopover');

        var callback = function (html) {
            Piwik_Popover.setContent(html);

            // use the popover title returned from the server
            var title = box.find('h2[piwik-enriched-headline]');
            if (title.size() > 0) {
                // TODO use translation of segment name and translation in general
                var segmentParts = segment.split(self.segmentComparison);
                var dataTable    = getDataTableFromApiMethod(apiMethod);
                var segmentName  = getNameOfSegmentFromDataTable(dataTable, segmentParts[0]);
                var segmentValue = decodeURIComponent(segmentParts[1]);

                // TODO move escape to piwikhelper or somewhere better
                var escape = angular.element(document).injector().get('$sanitize');
                segmentName = escape(segmentName);
                segmentValue = escape(segmentValue);

                Piwik_Popover.setTitle(title.html() + ' showing visits where ' + segmentName + ' is "' + segmentValue + '"');
                title.remove();
            }

            box.find('.visitor-log-visitor-profile-link').remove();
            /* TODO replace links within visitor log to ajax requests etc for example like this:
            box.find('.visitor-log-visitor-profile-link').click(function () {
                var metric = $(this).val();
                Piwik_Popover.onClose(false); // unbind listener that resets multiEvolutionRows
                var extraParams = {action: 'getMultiRowEvolutionPopover', column: metric};
                self.openPopover(segment, extraParams, label);
                return true;
            });*/
        };

        // prepare loading the popover contents
        var requestParams = {
            module: 'Live',
            action: 'indexVisitorLog',
            segment: segment,
            disableLink: 1
        };

        $.extend(requestParams, extraParams);

        var ajaxRequest = new ajaxHelper();
        ajaxRequest.addParams(requestParams, 'get');
        ajaxRequest.setCallback(callback);
        ajaxRequest.setFormat('html');
        ajaxRequest.send(false);
    };

    DataTable_RowActions_Registry.register({

        name: actionName,

        // TODO use correct icons
        dataTableIcon: 'plugins/Live/images/visitorProfileLaunch.png',
        dataTableIconHover: 'plugins/Morpheus/images/segment-users.png',

        order: 30,

        dataTableIconTooltip: [
            _pk_translate('SegmentOneClick_RowActionTooltipTitle'),
            _pk_translate('SegmentOneClick_RowActionTooltipDefault')
        ],

        isAvailableOnReport: function (dataTableParams, undefined, dataTable) {
            return !!getFirstSegmentFromDataTable(dataTable);
        },

        isAvailableOnRow: function (dataTableParams, tr) {
            // TODO here we most likely have to update `this.dataTableIconTooltip` to include the name of segment and value

            var reportTitle = null;

            var apiMethod = $(tr).parents('div.dataTable').last().attr('data-report');
            var dimension = getDimensionFromApiMethod(apiMethod);

            if (dimension) {
                reportTitle = _pk_translate('SegmentOneClick_RowActionTooltipWithDimension', [dimension])
            } else {
                reportTitle = _pk_translate('SegmentOneClick_RowActionTooltipDefault');
            }

            this.dataTableIconTooltip[1] = reportTitle;
            return true;
        },

        createInstance: function (dataTable, param) {
            if (dataTable !== null && typeof dataTable.segmentVisitorLogInstance != 'undefined') {
                return dataTable.segmentVisitorLogInstance;
            }

            if (dataTable === null && param) {
                // when segmented visitor log is triggered from the url (not a click on the data table)
                // we look for the data table instance in the dom
                var report = param.split(':')[0];
                var tempTable = getDataTableFromApiMethod(report);
                if (tempTable) {
                    dataTable = tempTable;
                    if (typeof dataTable.segmentVisitorLogInstance != 'undefined') {
                        return dataTable.segmentVisitorLogInstance;
                    }
                }
            }

            var instance = new DataTable_RowActions_SegmentVisitorLog(dataTable);
            if (dataTable !== null) {
                dataTable.segmentVisitorLogInstance = instance;
            }

            return instance;
        }

    });

})();
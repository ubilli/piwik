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

    function getLabelFromTr ($tr) {

        var label = $tr.attr('data-full-label');

        if (!label) {
            label = $tr.find('.label .value').text();
        }

        if (label) {
            label = $.trim(label);
        }

        return label;
    }

    function getRawSegmentValueFromRow(tr)
    {
        return $(tr).attr('data-segment-filter');
    }

    function findTitleOfRowHavingRawSegmentValue(apiMethod, rawSegmentValue)
    {
        var segmentValue = decodeURIComponent(rawSegmentValue);
        var $tr = $('[data-report="' + apiMethod + '"] tr[data-segment-filter="' + segmentValue + '"]').first();

        return getLabelFromTr($tr);
    }

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

        this.segmentComparison = '==';
    }

    DataTable_RowActions_SegmentVisitorLog.prototype = new DataTable_RowAction();

    DataTable_RowActions_SegmentVisitorLog.prototype.openPopover = function (apiMethod, segment, extraParams) {
        var urlParam = apiMethod + ':' + segment + ':' + encodeURIComponent(JSON.stringify(extraParams));

        broadcast.propagateNewPopoverParameter('RowAction', actionName + ':' + urlParam);
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.trigger = function (tr, e, subTableLabel) {
        var label = getRawSegmentValueFromRow(tr);

        this.performAction(label, tr, e);
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.performAction = function (label, tr, e) {

        var apiMethod = this.dataTable.param.module + '.' + this.dataTable.param.action;
        var segment   = encodeURIComponent(label);

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

            // remove title returned from the server
            var title = box.find('h2[piwik-enriched-headline]');
            if (title.size() > 0) {
                title.remove();
            }

            var dataTable    = getDataTableFromApiMethod(apiMethod);
            var segmentName  = getDimensionFromApiMethod(apiMethod);
            var segmentValue = findTitleOfRowHavingRawSegmentValue(apiMethod, segment);

            segmentName  = piwikHelper.escape(segmentName);
            segmentName  = piwikHelper.htmlEntities(segmentName);
            segmentValue = piwikHelper.escape(segmentValue);
            segmentValue = piwikHelper.htmlEntities(segmentValue);

            var title = _pk_translate('SegmentOneClick_SegmentedVisitorLogTitle', [segmentName, segmentValue]);

            Piwik_Popover.setTitle(title);

            box.find('.visitor-log-visitor-profile-link').remove();
        };

        // prepare loading the popover contents
        var requestParams = {
            module: 'Live',
            action: 'indexVisitorLog',
            segment: decodeURIComponent(segment),
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

        dataTableIcon: 'plugins/SegmentOneClick/images/visitorlog.png',
        dataTableIconHover: 'plugins/SegmentOneClick/images/visitorlog-hover.png',

        order: 30,

        dataTableIconTooltip: [
            _pk_translate('SegmentOneClick_RowActionTooltipTitle'),
            _pk_translate('SegmentOneClick_RowActionTooltipDefault')
        ],

        isAvailableOnReport: function (dataTableParams, undefined, dataTable) {
            var hasSegment = !!getFirstSegmentFromDataTable(dataTable);

            if (hasSegment) {
                return true;
            }

            var segmentFilters = dataTable.$element.find('[data-segment-filter]');

            return !!segmentFilters.length;
        },

        isAvailableOnRow: function (dataTableParams, tr) {
            var value = getRawSegmentValueFromRow(tr)
            if ('undefined' === (typeof value)) {
                return false;
            }

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
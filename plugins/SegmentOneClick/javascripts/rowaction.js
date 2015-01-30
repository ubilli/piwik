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

    function getLabelFromTr (tr) {
        var label = tr.find('span.label');

        // handle truncation
        var value = label.data('originalText');

        if (!value) {
            value = label.text();
        }
        value = value.trim();

        // if tr is a terminal node, we use the @ operator to distinguish it from branch nodes w/ the same name
        if (tr.hasClass('subDataTable')) {
            value = '/' + value; // TODO we should not always use "/" only for page urls!?!
        }

        return value;
    }

    function getFullLabelFromTr(tr, e, subTableLabel) {

        var label = getLabelFromTr(tr);

        // if we have received the event from the sub table, add the label
        if (subTableLabel) {
            var separator = ''; // LabelFilter::SEPARATOR_RECURSIVE_LABEL
            label += separator + subTableLabel;
        }

        // handle sub tables in nested reports: forward to parent
        var subtable = tr.closest('table');
        if (subtable.is('.subDataTable')) {
            label = getFullLabelFromTr(subtable.closest('tr').prev(), e, label);
        }

        // ascend in action reports
        if (subtable.closest('div.dataTableActions').length) {
            var allClasses = tr.attr('class');
            var matches = allClasses.match(/level[0-9]+/);
            var level = parseInt(matches[0].substring(5, matches[0].length), 10);
            if (level > 0) {
                // .prev(.levelX) does not work for some reason => do it "by hand"
                var findLevel = 'level' + (level - 1);
                var ptr = tr;
                while ((ptr = ptr.prev()).size() > 0) {
                    if (!ptr.hasClass(findLevel) || ptr.hasClass('nodata')) {
                        continue;
                    }

                    label = getFullLabelFromTr(ptr, e, label);
                    return label;
                }
            }
        }

        return label;
    }

    function getRawSegmentValueFromRow(tr)
    {
        return $(tr).attr('data-segment-value');
    }

    function findTitleOfRowHavingRawSegmentValue(apiMethod, rawSegmentValue)
    {
        var $tr = $('[data-report="' + apiMethod + '"] tr[data-segment-value="' + rawSegmentValue + '"]').first();

        if ($tr) {
            var label = getFullLabelFromTr($tr);
         //   var label = $tr.find('.label .value').text();

            if (label) {
                rawSegmentValue = $.trim(label);
            }
        }

        return rawSegmentValue;
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
        this.segment = getFirstSegmentFromDataTable(dataTable);
    }

    DataTable_RowActions_SegmentVisitorLog.prototype = new DataTable_RowAction();

    DataTable_RowActions_SegmentVisitorLog.prototype.openPopover = function (apiMethod, segment, extraParams) {
        var urlParam = apiMethod + ':' + segment + ':' + encodeURIComponent(JSON.stringify(extraParams));

        broadcast.propagateNewPopoverParameter('RowAction', actionName + ':' + urlParam);
    };

    DataTable_RowActions_SegmentVisitorLog.isPageActionReport = function (module, action) {
        return module == 'Actions' &&
        (action == 'getPageUrls' || action == 'getEntryPageUrls' || action == 'getExitPageUrls' || action == 'getPageUrlsFollowingSiteSearch' || action == 'getPageTitles' || action == 'getPageTitlesFollowingSiteSearch');
    };

    DataTable_RowActions_SegmentVisitorLog.prototype.trigger = function (tr, e, subTableLabel) {
        var label = getRawSegmentValueFromRow(tr);

        this.performAction(label, tr, e);
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

            // remove title returned from the server
            var title = box.find('h2[piwik-enriched-headline]');
            if (title.size() > 0) {
                title.remove();
            }

            var segmentParts = segment.split(self.segmentComparison);
            var dataTable    = getDataTableFromApiMethod(apiMethod);
            var segmentName  = getNameOfSegmentFromDataTable(dataTable, segmentParts[0]);
            var segmentValue = findTitleOfRowHavingRawSegmentValue(apiMethod, segmentParts[1]);

            segmentName  = piwikHelper.escape(segmentName);
            segmentValue = piwikHelper.escape(segmentValue);

            var title = _pk_translate('SegmentOneClick_SegmentedVisitorLogTitle', [segmentName, segmentValue]);

            Piwik_Popover.setTitle(title);

            // TODO remove visitor profile link or close popover??? as we won't have a "go back" link
            //box.find('.visitor-log-visitor-profile-link').remove();
            box.find('.visitor-log-visitor-profile-link').click(function () {
                Piwik_Popover.close();
            });
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
            if (!getRawSegmentValueFromRow(tr)) {
                return false;
            }

            if (tr.hasClass('subDataTable')) {
                if (DataTable_RowActions_SegmentVisitorLog.isPageActionReport(dataTableParams.module, dataTableParams.action))
                {
                    return false;
                }
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
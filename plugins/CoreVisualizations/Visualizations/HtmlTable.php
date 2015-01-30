<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 *
 */
namespace Piwik\Plugins\CoreVisualizations\Visualizations;

use Piwik\API\Request as ApiRequest;
use Piwik\Common;
use Piwik\DataTable;
use Piwik\Period;
use Piwik\Plugin\Visualization;
use Piwik\View;

/**
 * DataTable visualization that shows DataTable data in an HTML table.
 *
 * @property HtmlTable\Config $config
 */
class HtmlTable extends Visualization
{
    const ID = 'table';
    const TEMPLATE_FILE     = "@CoreVisualizations/_dataTableViz_htmlTable.twig";
    const FOOTER_ICON       = 'plugins/Morpheus/images/table.png';
    const FOOTER_ICON_TITLE = 'General_DisplaySimpleTable';

    public static function getDefaultConfig()
    {
        return new HtmlTable\Config();
    }

    public static function getDefaultRequestConfig()
    {
        return new HtmlTable\RequestConfig();
    }

    public function beforeLoadDataTable()
    {
        parent::beforeLoadDataTable();
        $report = $this->report;

        $this->config->filters[] = function (DataTable $dataTable) use ($report) {

            if (empty($report) || empty($dataTable) || !$dataTable->getRowsCount()) {
                return;
            }

            $dimension = $report->getDimension();

            if (empty($dimension)) {
                return;
            }

            $segments = $dimension->getSegments();

            if (empty($segments)) {
                return;
            }

            $segment     = array_shift($segments);
            $hasCallback = $segment->getSqlFilter() || $segment->getSqlFilterValue();

            if ($segment->getSuggestedValuesCallback()) {
                return;
            }

            foreach ($dataTable->getRows() as $row) {
                if ($hasCallback) {
                    $row->setMetadata('segment_value', $row->getColumn('label'));
                } else {
                    $label = $row->getMetadata('original_label');

                    if (false === $label) {
                        $label = $row->getColumn('label');
                    }

                    $row->setMetadata('segment_value', $label);
                }
            }
        };
    }

    public function beforeRender()
    {
        if ($this->requestConfig->idSubtable
            && $this->config->show_embedded_subtable) {

            $this->config->show_visualization_only = true;
        }

        // we do not want to get a datatable\map
        $period = Common::getRequestVar('period', 'day', 'string');
        if (Period\Range::parseDateRange($period)) {
            $period = 'range';
        }

        if ($this->dataTable->getRowsCount()) {
            $request = new ApiRequest(array(
                'method' => 'API.get',
                'module' => 'API',
                'action' => 'get',
                'format' => 'original',
                'filter_limit'  => '-1',
                'disable_generic_filters' => 1,
                'expanded'      => 0,
                'flat'          => 0,
                'filter_offset' => 0,
                'period'        => $period,
                'showColumns'   => implode(',', $this->config->columns_to_display),
                'columns'       => implode(',', $this->config->columns_to_display),
                'pivotBy'       => ''
            ));

            $dataTable = $request->process();
            $this->assignTemplateVar('siteSummary', $dataTable);
        }

        if ($this->requestConfig->pivotBy) {
            $this->config->columns_to_display = $this->dataTable->getColumns();
        }
    }

}

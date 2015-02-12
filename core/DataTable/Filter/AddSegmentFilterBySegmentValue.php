<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 *
 */
namespace Piwik\DataTable\Filter;

use Piwik\DataTable\BaseFilter;
use Piwik\DataTable;

/**
 * Converts for each row of a {@link DataTable} a segmentValue to a segmentFilter. The name of the segment
 * is automatically detected based on the given report.
 *
 * **Basic usage example**
 *
 *     $dataTable->filter('AddSegmentFilterBySegmentValue', array($reportInstance));
 *
 * @api
 */
class AddSegmentFilterBySegmentValue extends BaseFilter
{
    /**
     * @var \Piwik\Plugin\Report
     */
    private $report;

    /**
     * @param DataTable $table
     * @param $report
     */
    public function __construct($table, $report)
    {
        parent::__construct($table);
        $this->report = $report;
    }

    /**
     * See {@link AddSegmentFilterBySegmentValue}.
     *
     * @param DataTable $table
     * @return int The number of deleted rows.
     */
    public function filter($table)
    {
        if (empty($this->report) || empty($table) || !$table->getRowsCount()) {
            return;
        }

        $dimension = $this->report->getDimension();

        if (empty($dimension)) {
            return;
        }

        $segments = $dimension->getSegments();

        if (empty($segments)) {
            return;
        }

        /** @var \Piwik\Plugin\Segment $segment */
        $segment     = array_shift($segments);
        $segmentName = $segment->getSegment();

        $search  = array(',', ';', '&');
        $replace = array(urlencode(','), urlencode(';'), urlencode('&'));

        foreach ($table->getRows() as $row) {
            $value  = $row->getMetadata('segmentValue');
            $filter = $row->getMetadata('segmentFilter');

            if ($value !== false && $filter === false) {
                $value = str_replace($search, $replace, $value);
                $row->setMetadata('segmentFilter', sprintf('%s==%s', $segmentName, $value));
            }
        }
    }
}

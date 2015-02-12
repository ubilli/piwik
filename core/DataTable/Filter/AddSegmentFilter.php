<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 *
 */
namespace Piwik\DataTable\Filter;

use Piwik\DataTable;
use Piwik\DataTable\BaseFilter;
use Piwik\Development;

/**
 * Executes a filter for each row of a {@link DataTable} and generates a segment filter for each row.
 *
 * **Basic usage example**
 *
 *     $dataTable->filter('AddSegmentFilter', array('segmentName'));
 *     $dataTable->filter('AddSegmentFilter', array(array('segmentName1', 'segment2'), ';');
 *
 * @api
 */
class AddSegmentFilter extends BaseFilter
{
    private $segments;
    private $delimiter;

    /**
     * Generates a segment filter based on the label column and the given segment names
     *
     * @param DataTable $table
     * @param string|array $segmentOrSegments Either one segment or an array of segments.
     *                                        If more than one segment is given a delimter has to be defined.
     * @param string $delimiter               The delimiter by which the label should be splitted.
     */
    public function __construct($table, $segmentOrSegments, $delimiter = '')
    {
        parent::__construct($table);

        if (!is_array($segmentOrSegments)) {
            $segmentOrSegments = array($segmentOrSegments);
        }

        $this->segments  = $segmentOrSegments;
        $this->delimiter = $delimiter;
    }

    /**
     * See {@link AddSegmentFilter}.
     *
     * @param DataTable $table
     */
    public function filter($table)
    {
        $delimiter = $this->delimiter;
        $segments  = $this->segments;

        if (empty($segments)) {
            $msg = 'AddSegmentFilter is called without having any segments defined';
            Development::error($msg);
            return;
        }

        if (count($segments) === 1) {
            $table->filter(function (DataTable $dataTable) use ($segments) {
                $segment = array_shift($segments);

                foreach ($dataTable->getRows() as $key => $row) {
                    if ($key == DataTable::ID_SUMMARY_ROW) {
                        continue;
                    }

                    $label = $row->getColumn('label');

                    if (!empty($label)) {
                        $row->setMetadata('segmentFilter', $segment . '==' . $label);
                    }
                }
            });
        } else if (!empty($delimiter)) {
            $table->filter(function (DataTable $dataTable) use ($segments, $delimiter) {
                $numSegments  = count($segments);
                $conditionAnd = ';';

                foreach ($dataTable->getRows() as $key => $row) {
                    if ($key == DataTable::ID_SUMMARY_ROW) {
                        continue;
                    }

                    $label = $row->getColumn('label');
                    if (!empty($label)) {
                        $parts = explode($delimiter, $label);

                        if (count($parts) === $numSegments) {
                            $filter = array();
                            foreach ($segments as $index => $segment) {
                                if (!empty($segment)) {
                                    $filter[] = $segment . '==' . $parts[$index];
                                }
                            }
                            $row->setMetadata('segmentFilter', implode($conditionAnd, $filter));
                        }
                    }
                }
            });
        } else {
            $names = implode(', ', $segments);
            $msg   = 'Multiple segments are given but no delimiter defined. Segments: ' . $names;
            Development::error($msg);
        }
    }
}

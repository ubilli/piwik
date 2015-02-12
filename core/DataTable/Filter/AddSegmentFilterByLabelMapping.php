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

/**
 * Executes a filter for each row of a {@link DataTable} and generates a segment filter for each row.
 * It will map the label column to a segmentValue by searching for the label in the index of the given
 * mapping array.
 *
 * **Basic usage example**
 *
 *     $dataTable->filter('AddSegmentFilterByLabelMapping', array('segmentName', array('1' => 'smartphone, '2' => 'desktop')));
 *
 * @api
 */
class AddSegmentFilterByLabelMapping extends BaseFilter
{
    private $segment;
    private $mapping;

    /**
     * @param DataTable $table
     * @param string $segment
     * @param array $mapping
     */
    public function __construct($table, $segment, $mapping)
    {
        parent::__construct($table);

        $this->segment = $segment;
        $this->mapping = $mapping;
    }

    /**
     * See {@link AddSegmentFilterByLabelMapping}.
     *
     * @param DataTable $table
     */
    public function filter($table)
    {
        $mapping = $this->mapping;
        $segment = $this->segment;

        if (empty($segment) || empty($mapping)) {
            return;
        }

        $table->filter(function (DataTable $dataTable) use ($segment, $mapping) {
            foreach ($dataTable->getRows() as $row) {
                $label = $row->getColumn('label');

                if (!empty($mapping[$label])) {
                    $label = $mapping[$label];
                    $row->setMetadata('segmentFilter', $segment . '==' . $label);
                }
            }
        });
    }
}

<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 *
 */
namespace Piwik\Plugins\DevicesDetection\Columns;

use Piwik\Piwik;
use Piwik\Plugin\Segment;
use Piwik\Tracker\Request;
use DeviceDetector;
use Exception;
use Piwik\Tracker\Visitor;
use Piwik\Tracker\Action;
use DeviceDetector\Parser\Device\DeviceParserAbstract as DeviceParser;

class DeviceType extends Base
{
    protected $columnName = 'config_device_type';
    protected $columnType = 'TINYINT( 100 ) NULL DEFAULT NULL';

    protected function configureSegments()
    {
        $deviceTypes = DeviceParser::getAvailableDeviceTypeNames();

        $segment = new Segment();
        $segment->setCategory('General_Visit');
        $segment->setSegment('deviceType');
        $segment->setName('DevicesDetection_DeviceType');
        $segment->setLabelToValueMapping($deviceTypes);

        $this->addSegment($segment);
    }

    public function getName()
    {
        return Piwik::translate('DevicesDetection_DeviceType');
    }

    /**
     * @param Request $request
     * @param Visitor $visitor
     * @param Action|null $action
     * @return mixed
     */
    public function onNewVisit(Request $request, Visitor $visitor, $action)
    {
        $userAgent = $request->getUserAgent();
        $parser    = $this->getUAParser($userAgent);

        return $parser->getDevice();
    }
}

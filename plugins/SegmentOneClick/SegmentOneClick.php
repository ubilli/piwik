<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 *
 */
namespace Piwik\Plugins\SegmentOneClick;

use Piwik\Plugin;

class SegmentOneClick extends \Piwik\Plugin
{

    /**
     * @see Piwik\Plugin::getListHooksRegistered
     */
    public function getListHooksRegistered()
    {
        return array(
            'AssetManager.getJavaScriptFiles' => 'getJsFiles',
            'Translate.getClientSideTranslationKeys' => 'getClientSideTranslationKeys'
        );
    }

    public function getJsFiles(&$jsFiles)
    {
        if (Plugin\Manager::getInstance()->isPluginActivated('Live')) {
            $jsFiles[] = "plugins/SegmentOneClick/javascripts/rowaction.js";
        }
    }

    public function getClientSideTranslationKeys(&$translationKeys)
    {
        $translationKeys[] = "SegmentOneClick_RowActionTooltipTitle";
        $translationKeys[] = "SegmentOneClick_RowActionTooltipDefault";
        $translationKeys[] = "SegmentOneClick_RowActionTooltipWithDimension";
        $translationKeys[] = "SegmentOneClick_SegmentedVisitorLogTitle";
    }
}

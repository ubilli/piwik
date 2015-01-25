<?php
/**
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */
namespace Piwik\Tests\Fixtures;

use Piwik\Date;
use Piwik\Tracker\Visit;
use Piwik\Tests\Framework\Fixture;
use PiwikTracker;

class Issue_7056 extends Fixture
{
    public $idSite = 1;
    public $dateTime = '2015-01-26 12:12:33';

    /**
     * @var \PiwikTracker
     */
    private $t;

    public function setUp()
    {
        $this->dateTime = Date::now()->getDatetime();

        $this->setUpWebsitesAndGoals();
        $this->t = self::getTracker($this->idSite, $this->dateTime, $defaultInit = true);
        $this->trackVisits();
    }

    public function tearDown()
    {
        // empty
    }

    private function setUpWebsitesAndGoals()
    {
        // tests run in UTC, the Tracker in UTC
        if (!self::siteCreated($this->idSite)) {
            self::createWebsite($this->dateTime, 1);
        }
    }

    private function trackVisits()
    {
        $this->t->setNewVisitorId();
        $this->trackPageView('/index.html', 'incredible title!');

        // log in
        $this->t->setUserId('test_user');

        // view 3 more pages
        $this->trackPageView('/product/p1.html', 'Product 1');
        $this->trackPageView('/product/p2.html', 'Product 2');
        $this->trackPageView('/product/p3.html', 'Product 3');

        // add first item
        $this->t->addEcommerceItem('MySku3', 'Product 3', 'Cloud Small', 4.33, 1);
        $this->t->doTrackEcommerceCartUpdate(4.33);

        // view another page
        $this->trackPageView('/product/p3.html', 'Product 3');

        // add second item
        $this->t->addEcommerceItem('MySku3', 'Product 3', 'Cloud Small', 4.33, 1);
        $this->t->addEcommerceItem('MySku4', 'Product 4', 'Cloud Big', 6.56, 1);
        $this->t->doTrackEcommerceCartUpdate(10.89);

        // view 2 more pages
        $this->trackPageView('/faq.html', 'FAQ');
        $this->trackPageView('/contact.html', 'Contact');

        // purchase
        $this->t->addEcommerceItem('MySku3', 'Product 3', 'Cloud Small', 4.33, 1);
        $this->t->addEcommerceItem('MySku4', 'Product 4', 'Cloud Big', 6.56, 1);
        $this->t->doTrackEcommerceOrder('myOrderId', 15.89, 10.89, 2.00, 3.00, 0.00);
    }

    private function trackPageView($url, $title)
    {
        $this->t->setUrl('http://example.org' . $url);
        self::checkResponse($this->t->doTrackPageView($title));
    }

}
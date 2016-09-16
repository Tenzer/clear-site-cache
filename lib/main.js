var buttons = require('sdk/ui/button/action');
var cm = require('sdk/context-menu');
var tabs = require('sdk/tabs');
var url = require('sdk/url');
var notifications = require('sdk/notifications');
var {Cc, Ci, Cu} = require('chrome');
Cu.import('resource://gre/modules/LoadContextInfo.jsm');
var cache_storage_service = Cc['@mozilla.org/network/cache-storage-service;1'].getService(Ci.nsICacheStorageService);


var icons = {
    '16': './icon-16.png',
    '32': './icon-32.png',
    '64': './icon-64.png',
};

var button = buttons.ActionButton({
    id: 'clear-cache',
    label: 'Initializing',
    icon: icons,
    disabled: true,
    onClick: clearCache,
});

function updateButton () {
    var active_url = url.URL(tabs.activeTab.url);
    if (active_url.scheme === 'http' || active_url.scheme === 'https') {
        button.label = 'Clear cache for "' + active_url.host + '"';
        button.state('tab', {disabled: false});
    } else {
        button.label = 'Can\'t clear the cache for this type of site';
        button.state('tab', {disabled: true});
    }
}
updateButton(); // Set the initial state

tabs.on('activate', function (tab) {
    updateButton();
});

tabs.on('ready', function (tab) {
    if (tab.id === tabs.activeTab.id) {
        updateButton();
    }
});


var stats = {
    host: null,
    removed: null,
    total_size: null,
};

var disk_visitor = {
    onCacheStorageInfo: function () {},

    onCacheEntryInfo: function (uri, _, size) {
        if (stats.host !== uri.host) {
            return;
        }

        stats.removed++;
        stats.total_size += size;
        cache_storage_service.diskCacheStorage(LoadContextInfo.default, false).asyncDoomURI(uri, null, null);
    },

    onCacheEntryVisitCompleted: function () {
        notifications.notify({
            title: 'Site cache cleared',
            iconURL: icons['64'],
            text: (0 + stats.removed) + ' entries removed (' + (0 + stats.total_size) + ' bytes)',
        });

        for (var key in stats) {
            stats[key] = null;
        }
    },
};

cm.Item({
    label: 'Clear Site Cache',
    context: cm.URLContext('*'),
    contentScript: 'self.on("click", self.postMessage);',
    onMessage: clearCache,
});

function clearCache (state) {
    stats.host = url.URL(tabs.activeTab.url).host;
    cache_storage_service.diskCacheStorage(LoadContextInfo.default, false).asyncVisitStorage(disk_visitor, true);
}

var buttons = require('sdk/ui/button/action');
var tabs = require('sdk/tabs');
var url = require('sdk/url');
var notifications = require('sdk/notifications');
var {Cc, Ci, Cu} = require('chrome');
Cu.import('resource://gre/modules/LoadContextInfo.jsm');


var color_icons = {
    '16': './color-16.png',
    '32': './color-32.png',
    '64': './color-64.png'
}
var gray_icons = {
    '16': './gray-16.png',
    '32': './gray-32.png',
    '64': './gray-64.png'
}

var button = buttons.ActionButton({
    id: 'clear-cache',
    label: 'Initializing',
    icon: gray_icons,
    disabled: true,
    onClick: clearCache
});

function updateButton () {
    var active_url = url.URL(tabs.activeTab.url);
    if (active_url.scheme === 'http' || active_url.scheme === 'https') {
        button.label = 'Clear cache for "' + active_url.host + '"';
        button.state('tab', {disabled: false});
        button.icon = color_icons;
    } else {
        button.label = 'Can\'t clear the cache for this type of site';
        button.state('tab', {disabled: true});
        button.icon = gray_icons;
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


function notify (stats) {
    notifications.notify({
        title: 'Site cache cleared!',
        iconURL: color_icons['64'],
        text: stats.removed + ' entries removed (' + stats.total_size + ' bytes) in ' + (Date.now() - stats.started) + ' ms'
    });
}


var stats = {
    host: null,
    removed: null,
    total_size: null,
    started: null
};

var disk_visitor = {
    onCacheStorageInfo: function () {},

    onCacheEntryInfo: function (uri, _, size) {
        if ((uri.scheme === 'http' || uri.scheme === 'https') && stats.host === uri.host) {
            var cache_storage_service = Cc['@mozilla.org/network/cache-storage-service;1'].getService(Ci.nsICacheStorageService);
            cache_storage_service.diskCacheStorage(LoadContextInfo.default, false).asyncDoomURI(uri, null, null);
            stats.removed++;
            stats.total_size += size;
        }
    },

    onCacheEntryVisitCompleted: function () {
        notify(stats);
        for (var key in stats) {
            stats[key] = null;
        }
    }
};

function clearCache (state) {
    stats.host = url.URL(tabs.activeTab.url).host;
    stats.started = Date.now();
    var cache_storage_service = Cc['@mozilla.org/network/cache-storage-service;1'].getService(Ci.nsICacheStorageService);
    cache_storage_service.diskCacheStorage(LoadContextInfo.default, false).asyncVisitStorage(disk_visitor, true);
}

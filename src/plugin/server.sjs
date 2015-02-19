module.exports = {
    init: function (client, imports) {
        const isupport = {};

        client._messageHandler.isupport(isupport);

        return {
            handlers: {
                '005': function (isupportMessage) {
                    isupportMessage.params.slice(1, -1).map(function (param) {
                        return param.split('=');
                    }).forEach(function {
                        ([supported]) => isupport[supported] = true,
                        ([supported, value]) => isupport[supported] = value
                    });
                }
            },

            exports: {
                isupport: isupport
            }
        };
    }
};

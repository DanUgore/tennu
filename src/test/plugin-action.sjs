const sinon = require("sinon");
const assert = require("better-assert");
const equal = require("deep-eql");
const inspect = require("util").inspect;
const format = require("util").format;
require("source-map-support").install();

const debug = false;
const logfn = debug ? console.log.bind(console) : function () {};
const logger = {
    debug: logfn, info: logfn, notice: logfn, warn: logfn,
    error: function (plugin, message) {logfn(plugin, message); assert(message !== false);}
};

const channel = "#test";
const nickname = "testbot";

const nicknamefn = function () { return nickname; };

const ActionPlugin = require("../tennu_plugins/action");
const EventEmitter = require("after-events");

describe "IRC Output Socket:" {
    var socket, out, messageHandler;

    beforeEach {
        logfn(/* newline */);
        messageHandler = new EventEmitter();
        socket = { raw: sinon.spy() };
        out = ActionPlugin.init({
            _socket: socket,
            //messageHandler,
            nickname: nicknamefn,
            debug: logfn,
            info: logfn,
            note: logfn,
            error: logfn,
            on: function (handlers) {
                Object.keys(handlers).forEach(function (key) {
                    messageHandler.on(key, handlers[key]);
                });
            },

            off: function (handlers) {
                Object.keys(handlers).forEach(function (key) {
                    messageHandler.off(key, handlers[key]);
                });
            }
        }).exports;
    }

    describe only "Join" {
        it "can join a single channel successfully" {
            // JOIN #success
            // :testbot!tennu@tennu.github.io JOIN :#success
            // :irc.server.net 332 testbot #success :Topic for #success.
            // :irc.server.net 333 testbot #success topic-changer 1333333333
            // :irc.server.net 353 testbot @ #success :testbot @topic-changer other-user
            // :irc.server.net 366 testbot #success :End of /NAMES list.
            const channel = "#success";
            const topic = "Topic for #success.";
            const topicSetter = "topic-changer";
            const topicSetTimestamp = 1333333333;
            const nicknames = ["testbot", "@topic-changer", "other-user"];

            const joinmsg = {nickname: nickname, channel: channel};
            const topicmsg = {channel: channel, topic: topic};
            const topicwhotimemsg = {channel: channel, who: topicSetter, timestamp: topicSetTimestamp};
            const namesmsg = {channel: channel, nicknames: nicknames};
            const endofnamesmsg = {channel: channel};

            var promise = out.join(channel)
            .then(function (result) {
                const joinInfo = result.ok();
                logfn(inspect(joinInfo));
                // TODO: Is that actually the right format to raw?
                assert(socket.raw.calledWithExactly(format("JOIN :%s", channel)));
                assert(joinInfo.channel === channel);
                assert(joinInfo.nickname === nickname);
                assert(equal(joinInfo.names, nicknames));
                assert(equal(joinInfo.topic, {
                    topic: topic,
                    setter: topicSetter,
                    timestamp: topicSetTimestamp
                }));
            });

            messageHandler.emit("join", joinmsg);
            messageHandler.emit("rpl_topic", topicmsg);
            messageHandler.emit("rpl_topicwhotime", topicwhotimemsg);
            messageHandler.emit("rpl_namreply", namesmsg);
            messageHandler.emit("rpl_endofnames", endofnamesmsg);

            return promise;
        }

        it skip "returns a fail trying to join a non-existent channel" {
            // JOIN not_a_channel
            //:irc.server.net 403 testbot not_a_channel :No such channel
        }

        it skip "Sends the channel key, if present." {}

        describe "timeouts" {
            var clock;

            beforeEach {
                clock = sinon.useFakeTimers();
            }

            afterEach {
                clock.restore();
            }

            it "cause rejection of the promise" (done) {
                // Note: This should never happen.
                // JOIN #channel
                // <silence>

                out.join("#channel")
                .then(done) // done with a value fails the test.
                .catch(function (err) {
                    assert(err instanceof Error);
                    done();
                });

                clock.tick(60 * 60 * 1000 + 1);
            }
        }
    }

    describe skip "Whois" {
        it "can get information about a specific user" {}
    }

    it "can send private messages" {
        out.say("#test", "Hi");
        assert(socket.raw.calledWithExactly("PRIVMSG #test :Hi"));
    }

    it "can part without a reason" {
        out.part("#test");
        assert(socket.raw.calledWithExactly("PART #test"));
    }

    it "can part with a reason" {
        out.part("#test", "the reason");
        assert(socket.raw.calledWithExactly("PART #test :the reason"));
    }

    it "can quit without a reason" {
        out.quit();
        assert(socket.raw.calledWithExactly("QUIT"));
    }

    it "can quit with a reason" {
        out.quit("the reason");
        assert(socket.raw.calledWithExactly("QUIT :the reason"));
    }

    describe "Kick" {
        it "with a reason" {
            out.kick("#test", "user", "naughty naughty");
            assert(socket.raw.calledWithExactly("KICK #test user :naughty naughty"));
        }

        it "without a reason" {
            out.kick("#test", "user");
            assert(socket.raw.calledWithExactly("KICK #test user"));
        }
    }
}
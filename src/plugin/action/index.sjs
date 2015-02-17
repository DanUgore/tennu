const inspect = require("util").inspect;
const format = require("util").format;
const chunk = require("chunk");
const Promise = require("bluebird");
const EventEmitter = require("events").EventEmitter;

module.exports = ActionPlugin = {
    init: function (client, imports) {
        const emitter = new EventEmitter();

        function raw (line) {
            if (Array.isArray(line)) { line = line.join(" "); }
            client.info("->", String(line));
            client._socket.raw(line);
        }

        function rawf () {
            raw(format.apply(null, arguments));
        }


        function say (target, body) {
            if (Array.isArray(body)) {
                body.forEach(λ[say(target, #)]);
                return;
            }

            rawf("PRIVMSG %s :%s", target, body);
        }

        function ctcp (target, type, body) {
            if (Array.isArray(body)) {
                body.forEach(λ[ctcp(target, type, #)]);
                return;
            }
            
            if (body) {
                say(target, format("\u0001%s %s\u0001", type, body));
            } else {
                say(target, format("\u0001%s\u0001", type));
            }
        }

        function act (target, body) {
            ctcp(target, "ACTION", body);
        }

        function notice (target, body) {
            if (Array.isArray(body)) {
                body.forEach(λ[notice(target, #)]);
                return;
            }

            rawf("NOTICE %s :%s", target, body);
        }

        const join = require("./join")(client, rawf, emitter);


        function part (channel, reason) {
            raw("PART " + channel + (reason ? " :" + reason: ""));
        }

        function kick (channel, nickname, reason) {
            if (reason) {
                rawf("KICK %s %s :%s", channel, nickname, reason);
            } else {
                rawf("KICK %s %s", channel, nickname);
            }
        }

        function nick (newNick) {
            rawf("NICK %s", newNick);
        }

        function quit (reason) {
            client.note(format("Quitting with reason: %s", reason));
            raw("QUIT" + (reason ? " :" + reason : ""));
        }

        function mode (target, plus, minus, inArgs) {
            var args = ":";

            if (plus) {
                args += "+" + plus;
            }

            if (minus) {
                args += "-" + minus;
            }

            if (inArgs) {
                args += " " + (Array.isArray(inArgs) ? inArgs.join(" ") : inArgs);
            }

            raw(["MODE", target, args]);
        }

        function userhost (users) {
            if (typeof users === "string") {
                rawf("USERHOST:%s", users);
            } else if (typeof users === "array") {
                chunk(users, 5)
                .map(function (hosts) { return hosts.join(" "); })
                .map(userhost);
            } else {
                throw new Error("Userhost command takes either a string (a single nick) or an array (of string nicks)");
            }
        }

        function who (channel) {
            raw(["WHO", channel]);
        }

        const whois = require("./whois")(client, rawf, emitter);

        /* To replace these functions...
        const part = require("./part")(client, action_plugin);
        const quit = require("./quit")(client, action_plugin);
        const nick = require("./nick")(client, action_plugin);
        const mode = require("./mode")(client, action_plugin);
        const userhost = require("./userhost")(client, action_plugin);
        const who = require("./who")(client, action_plugin);
        */

        return {
            exports: {
                emitter: emitter,

                raw: raw,
                rawf: rawf,
                
                say: say,
                ctcp: ctcp,
                act: act,
                notice: notice,
                join: join,
                part: part,
                kick: kick,
                nick: nick,
                quit: quit,
                mode: mode,
                userhost: userhost,
                who: who,
                whois: whois
            }
        };
    }
};
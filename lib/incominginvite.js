'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

/**
 * Construct an {@link IncomingInvite}.
 * @class
 * @classdesc An {@link IncomingInvite} to a {@link Conversation} can be
 * accepted or rejected.
 * <br><br>
 * {@link IncomingInvite}s are returned by {@link Client#event:invite}.
 * @param {IncomingInviteSignaling} signaling
 * @param {function(IncomingInvite.AcceptOptions, function(LocalMedia): Promise<ConversationSignaling>): Promise<ConversationSignaling>} getLocalMedia
 * @param {function(IncomingInvite.AcceptOptions, ConversationSignaling): Conversation} createConversation
 * @property {Conversation.SID} conversationSid - the SID of the {@link Conversation} this {@link IncomingInvite} invites to
 * @property {?string} from - the identity of the {@link Participant} that send this {@link IncomingInvite}
 * @property {Array<sting>} participants - the identities of the {@link Participant}s currently in the {@link Conversation}
 * @property {status} - the status of this {@link IncomingInvite}; one of "pending", "accepting", "accepted", "rejected",
 * "canceled", or "failed"
 * @fires IncomingInvite#accepted
 * @fires IncomingInvite#accepting
 * @fires IncomingInvite#canceled
 * @fires IncomingInvite#failed
 * @fires IncomingInvite#pending
 * @fires IncomingInvite#rejected
 */
function IncomingInvite(signaling, getLocalMedia, createConversation, options) {
  if (!(this instanceof IncomingInvite)) {
    return new IncomingInvite(signaling, getLocalMedia, createConversation);
  }
  EventEmitter.call(this);
  options = Object.assign({}, options);
  Object.defineProperties(this, {
    _createConversation: {
      value: createConversation
    },
    _getLocalMedia: {
      value: getLocalMedia
    },
    _options: {
      value: options
    },
    _signaling: {
      value: signaling
    },
    conversationSid: {
      enumerable: true,
      value: signaling.conversationSid
    },
    from: {
      enumerable: true,
      value: signaling.from
    },
    participants: {
      enumerable: true,
      value: signaling.from ? [signaling.from] : []
    },
    participantSid: {
      enumerable: true,
      value: signaling.participantSid
    },
    status: {
      enumerable: true,
      get: function() {
        return signaling.state;
      }
    }
  });

  handleSignalingEvents(this, signaling);
}

inherits(IncomingInvite, EventEmitter);

/**
 * Accept the {@link IncomingInvite} and join the {@link Conversation}.
 * @param {IncomingInvite.AcceptOptions} [options={localStreamConstraints:{audio:true,video:true}}] - Options to override {@link IncomingInvite#accept}'s default behavior
 * @returns {Promise<Conversation>}
 * @example
 * var initialToken = getAccessToken();
 * var client = new Twilio.Conversations.Client(initialToken);
 *
 * client.on('invite', function(invite) {
 *   console.log('Received IncomingInvite to join a Conversation with ' + invite.from);
 *
 *   // By default, accept will request the microphone and camera for you.
 *   invite.accept();
 * });
 */
IncomingInvite.prototype.accept = function accept(options) {
  options = Object.assign({}, this._options, options);
  var self = this;
  return this._getLocalMedia(options, function getLocalMediaSucceeded(localMedia) {
    return self._signaling.accept(localMedia, options);
  }).then(function acceptSucceeded(conversationSignaling) {
    return self._createConversation(options, conversationSignaling);
  });
};

/**
 * Reject the {@link IncomingInvite} to a {@link Conversation}.
 * @returns {this}
 * @example
 * var initialToken = getAccessToken();
 * var client = new Twilio.Conversations.Client(initialToken);
 *
 * client.on('invite', function(invite) {
 *   console.log('Rejecting IncomingInvite to join a Conversation with ' + invite.from);
 *   invite.reject();
 * });
 */
IncomingInvite.prototype.reject = function reject() {
  this._signaling.reject();
  return this;
};

/**
 * The {@link IncomingInvite} was accepted, and the {@link Client} is now
 * participating in the {@link Conversation}.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#accepted
 */

/**
 * The {@link Client} is attempting to accept the {@link IncomingInvite}.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#accepting
 */

/**
 * The {@link IncomingInvite} was canceled.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#canceled
 */

/**
 * The {@link IncomingInvite} failed.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#failed
 */

/**
 * The {@link IncomingInvite} is pending.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#pending
 */

/**
 * The {@link IncomingInvite} was rejected.
 * @param {IncomingInvite} invite - The {@link IncomingInvite}
 * @event IncomingInvite#rejected
 */

/**
 * You may pass these options to {@link IncomingInvite#accept} to
 * override the default behavior.
 * @typedef {object} IncomingInvite.AcceptOptions
 * @property {Array<RTCIceServer>} iceServers - Override the STUN and TURN
 * servers used by the {@link Client} when connecting to {@link Conversation}s
 * @property {RTCIceTransportPolicy} [iceTransportPolicy="all"] - Override the
 * ICE transport policy to be one of "relay" or "all"
 * @property {?LocalMedia} [localMedia=null] - Set to reuse an existing
 * {@link LocalMedia} object when accepting an {@link IncomingInvite}
 * @property {?MediaStream} [localStream=null] - Set to reuse an existing
 * MediaStream when accepting an {@link IncomingInvite}
 * @property {?object} [localStreamConstraints={audio:true,video:true}] - Set to
 * override the parameters passed to <code>getUserMedia</code> when neither
 * <code>localMedia</code> nor <code>localStream</code> are provided
 */

function handleSignalingEvents(incomingInvite, signaling) {
  // Reemit state transition events from the IncomingInviteSignaling.
  signaling.on('stateChanged', function stateChanged(state) {
    incomingInvite.emit(state, incomingInvite);
  });
}

module.exports = IncomingInvite;

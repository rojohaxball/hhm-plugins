// room.triggerEvent("onPlayerTouchTheBall", player, kick );

var room = HBInit();

room.pluginSpec = {
  name: `rojo/ball-touch`,
  author: `rojo`,
  version: `1.0.0`,
  config: {},
  configDescriptions: {},
  dependencies: [],
  order: {
    'onGameTick': {
      'before': [`sav/cron`],
    },
  },
  incompatible_with: [],
};

var playersThatTouchedTheBall = [];

function pointDistance ( p1, p2 ){
let d1 = p1.x - p2.x;
let d2 = p1.y - p2.y;
return Math.sqrt( d1 * d1 + d2 * d2 );
}

function onGameTickHandler () {
let players = room.getPlayerList();
let ballPosition = room.getBallPosition();
let ballRadius = room.getDiscProperties(0).radius;
for ( let i = 0; i < players.length; i++ ) { // Iterate over all the players

let player = players[i];

if ( player.position == null ) continue; // Skip players that don't have a position

let playerRadius = room.getPlayerDiscProperties(player.id).radius;
let triggerDistance = ballRadius + playerRadius + 0.01;
let distanceToBall = pointDistance(player.position, ballPosition);
let hadTouchedTheBall = playersThatTouchedTheBall.some((element) => element == player.id);

if ( playersThatTouchedTheBall.length > 3 ) playersThatTouchedTheBall.pop();
// This check is here so that the event is only notified the first game tick in which the player is touching the ball.
if ( distanceToBall < triggerDistance ) {
if ( !hadTouchedTheBall ) {
// room.sendAnnouncement( "[1] " + player.name + " touch the ball." ); // DEBUG
playersThatTouchedTheBall.unshift(player.id);
}
else {
// room.sendAnnouncement( "[2] " + player.name + " touch the ball." ); // DEBUG
playersThatTouchedTheBall.splice(playersThatTouchedTheBall.indexOf(player.id), 1);
playersThatTouchedTheBall.unshift(player.id);
}
room.triggerEvent("onPlayerTouchTheBall", player, false );
}
}
}

function onPlayerBallKickHandler ( player ) {
let index = playersThatTouchedTheBall.indexOf( player.id );
if ( index != -1 ) {
// room.sendAnnouncement( "[1] " + player.name + " kick the ball." ); // DEBUG
playersThatTouchedTheBall.splice( index, 1 );
playersThatTouchedTheBall.unshift( player.id );
}
else {
// room.sendAnnouncement( "[2] " + player.name + " kick the ball." ); // DEBUG
playersThatTouchedTheBall.unshift( player.id );
}
room.triggerEvent("onPlayerTouchTheBall", player, "onPlayerBallKick" );
}

function onPositionsResetHandler () {
playersThatTouchedTheBall = [];
}

function onGameStopHandler () {
playersThatTouchedTheBall = [];
}

function getLastPlayersWhoTouchedTheBall () {
return [...playersThatTouchedTheBall];
}

room.onRoomLink = function onRoomLink () {
room.onPlayerBallKick = onPlayerBallKickHandler;
room.onGameTick = onGameTickHandler;
room.onPositionsReset = onPositionsResetHandler;
room.onGameStop = onGameStopHandler;
room.getLastPlayersWhoTouchedTheBall = getLastPlayersWhoTouchedTheBall;
}

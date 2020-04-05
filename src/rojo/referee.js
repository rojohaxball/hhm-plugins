var room = HBInit();

room.pluginSpec = {
  name: `rojo/referee`,
  author: `rojo`,
  version: `1.0.0`,
  config: {},
  dependencies: [
    `rojo/ball-touch`,
  ],
  order: {
    'onGameTick': {
      'before': [`sav/cron`],
      'after': [`rojo/ball-touch`],
    },
  },
  incompatible_with: [],
};

const fun_x = { x : Math.cos( Math.PI / 4 ), y : Math.sin( Math.PI / 4 ) };
const inv_fun_x = { x : Math.cos( Math.PI / 4 * 3), y : Math.sin( Math.PI / 4 * 3) };
let isBallOutsideStadium = false;
let kickBallBehindTheLine = false;
let customRSMap;
let currentMap;

const colors = {
  defred : 0xe56e56,
  defblue : 0x5689e5,
  red : 0xff0000,
  blue : 0x0000ff,
  white : 0xffffff
};

const Team = {
  SPECTATORS: 0,
  RED: 1,
  BLUE: 2
};

let rs_maps = {
  rs_1 : {
    name : "RSHL Real Soccer",
    height : 600,
    width : 1150,
    rules : { corner : true, meta : true, goalKick : true },
    corner : { x : 1214, y : 635 },
    goalKick : { x : 1190, y : 205 },
    goalLine : { x : 1160, y : 124 },
  }
};

function isOutsideStadium ( ballPosition ) {
  return ballPosition.x > currentMap.width || ballPosition.x < -currentMap.width || ballPosition.y > currentMap.height || ballPosition.y < -currentMap.height;
}

// var temp;

function checkBallPosition () {
  let ball = room.getDiscProperties(0);
  let ballPosition = { x : ball.x, y : ball.y };
  if ( ballPosition.x > currentMap.width && ballPosition.x < -currentMap.width ) kickBallBehindTheLine = true;
  else kickBallBehindTheLine = false;
  if ( isOutsideStadium( ballPosition ) ) {
    if ( !isBallOutsideStadium ) {
      isBallOutsideStadium = true;
      if ( ballPosition.y < currentMap.goalLine.y && ballPosition.y > -currentMap.goalLine.y ) return;
      room.setDiscProperties( 0, { xspeed : 0, yspeed : 0 } );
      var lastPlayerThatTouchTheBall = room.getPlayer( room.getPlugin( `rojo/ball-touch` ).getLastPlayersWhoTouchedTheBall()[0] );
      if ( currentMap.rules.goalKick && ballPosition.x > currentMap.width && lastPlayerThatTouchTheBall.team == Team.RED ) {
        if ( ballPosition.y > currentMap.goalLine.y ) room.setDiscProperties( 0, { x : currentMap.goalKick.x + ball.radius, y : currentMap.goalKick.y } );
        else if ( ballPosition.y < -currentMap.goalLine.y ) room.setDiscProperties( 0, { x : currentMap.goalKick.x + ball.radius, y : -currentMap.goalKick.y } );
        room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defblue, style : "bold", sound : 1 });
        room.setDiscProperties( 0, { color : colors.blue } );
      }
      else if ( currentMap.rules.goalKick && ballPosition.x < -currentMap.width && lastPlayerThatTouchTheBall.team == Team.BLUE ) {
        if ( ballPosition.y > currentMap.goalLine.y ) room.setDiscProperties( 0, { x : -currentMap.goalKick.x - ball.radius, y : currentMap.goalKick.y } );
        else if ( ballPosition.y < -currentMap.goalLine.y ) room.setDiscProperties( 0, { x : -currentMap.goalKick.x - ball.radius, y : -currentMap.goalKick.y } );
        room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defred, style : "bold", sound : 1 });
        room.setDiscProperties( 0, { color : colors.red } );
      }
      else if ( currentMap.rules.corner && ballPosition.x > currentMap.width && lastPlayerThatTouchTheBall.team == Team.BLUE ) {
        if ( ballPosition.y > currentMap.goalLine.y ) room.setDiscProperties( 0, { x : inv_fun_x.x * ball.radius * 2 * Math.sqrt( 2 ) + currentMap.corner.x, y : inv_fun_x.y * ball.radius * 2 * Math.sqrt( 2 ) + currentMap.corner.y} );
        else if ( ballPosition.y < -currentMap.goalLine.y ) room.setDiscProperties( 0, { x : -fun_x.x * ball.radius * 2 * Math.sqrt( 2 ) + currentMap.corner.x, y : -fun_x.y * ball.radius * 2 * Math.sqrt( 2 ) - currentMap.corner.y} );
        room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defred, style : "bold", sound : 1 });
        room.setDiscProperties( 0, { color : colors.red } );
      }
      else if ( currentMap.rules.corner && ballPosition.x < -currentMap.width && lastPlayerThatTouchTheBall.team == Team.RED ) {
        if ( ballPosition.y > currentMap.goalLine.y ) room.setDiscProperties( 0, { x : fun_x.x * ball.radius * 2 * Math.sqrt( 2 ) - currentMap.corner.x, y : fun_x.y * ball.radius * 2 * Math.sqrt( 2 ) + currentMap.corner.y} );
        else if ( ballPosition.y < -currentMap.goalLine.y ) room.setDiscProperties( 0, { x : -inv_fun_x.x * ball.radius * 2 * Math.sqrt( 2 ) - currentMap.corner.x, y : -inv_fun_x.y * ball.radius * 2 * Math.sqrt( 2 ) - currentMap.corner.y} );
        room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defblue, style : "bold", sound : 1 });
        room.setDiscProperties( 0, { color : colors.blue } );
      }
      else if ( currentMap.rules.meta ) {
        // room.sendAnnouncement( "[DEBUG] Lateral" ); // DEBUG
        if ( ballPosition.y > 0 ) room.setDiscProperties( 0, { y : currentMap.corner.y - ball.radius } );
        else if ( ballPosition.y < 0 ) room.setDiscProperties( 0, { y : -currentMap.corner.y + ball.radius } );
        if ( lastPlayerThatTouchTheBall.team == Team.RED ) {
          room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐁𝐥𝐮𝐞 🔵`, undefined, { prefix: `𝐁`, color : colors.defblue, style : "bold", sound : 1 });
          room.setDiscProperties( 0, { color : colors.blue } );
        }
        else if ( lastPlayerThatTouchTheBall.team == Team.BLUE ) {
          room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐝 🔴`, undefined, { prefix: `𝐑`, color : colors.defred, style : "bold", sound : 1 });
          room.setDiscProperties( 0, { color : colors.red } );
        }
      }
    }
  }
  else {
    isBallOutsideStadium = false;
    // clearInterval( temp );
    room.setDiscProperties( 0, { color : colors.white } );
    if ( !kickBallBehindTheLine ) {
      
    }
    kickBallBehindTheLine = false;
  }
  return true;
}

function onGameTickHandler () {
  if ( customRSMap ) checkBallPosition();
}

function onStadiumChangeHandler ( newStadiumName, byPlayer ) {
  customRSMap = false;
  currentMap = null;
  for (const [key, value] of Object.entries(rs_maps)) {
    if ( value.name == newStadiumName ) {
      customRSMap = true;
      currentMap = value;
      // console.log( "[DEBUG] " + currentMap ); // DEBUG
      // console.log( "[DEBUG] " + customRSMap ); // DEBUG
      break;
    }
  }
}

function onPlayerBallKickHandler () {
  if ( isBallOutsideStadium ) {
    kickBallBehindTheLine = true;
  }
}

room.onRoomLink = function onRoomLink () {
  room.onStadiumChange = onStadiumChangeHandler;
  room.onGameTick = onGameTickHandler;
  room.onPlayerBallKick = onPlayerBallKickHandler;
}

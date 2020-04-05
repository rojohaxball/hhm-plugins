var room = HBInit();

room.pluginSpec = {
  name: `rojo/referee`,
  author: `rojo`,
  version: `1.0.0`,
  config: {
    tolerance : 100,
  },
  dependencies: [
    `rojo/ball-touch`,
  ],
  order: {
    'onGameTick': {
      'before': [`sav/cron`],
      'after': [`rojo/ball-touch`],
    },
    'onPlayerBallKick': {
      'after': [`rub/ball-touch`],
    },
  },
  incompatible_with: [],
};

const config = room.getConfig();

const fun_x = { x : Math.cos( Math.PI / 4 ), y : Math.sin( Math.PI / 4 ) };
const inv_fun_x = { x : Math.cos( Math.PI / 4 * 3), y : Math.sin( Math.PI / 4 * 3) };

let isBallOutsideStadium = false;
let kickBallBehindTheLine = false;

let badServe = false;
let lastPlayerThatTouchTheBall;
let teamThatShouldKick;
let lastBallPosition;

let customRSMap;
let currentMap;

const colors = {
  defred : 0xe56e56,
  defblue : 0x5689e5,
  red : 0xff0000,
  blue : 0x0000ff,
  white : 0xffffff,
  orange : 0xff8f43,
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

function isOutsideStadium ( ball ) {
  return ball.x > currentMap.width || ball.x < -currentMap.width || ball.y > currentMap.height || ball.y < -currentMap.height;
}

function onBallLeft ( ball ) {
  if ( badServe ) return; // wrong team kicked the ball or the ball was badly kicked
  if ( ball.y < currentMap.goalLine.y && ball.y > -currentMap.goalLine.y ) return; // if the ball passes the goal
  
  // temp = setInterval( function () { match.extraTime++ }, 1000 );
  
  lastPlayerThatTouchTheBall = room.getPlayer( room.getPlugin( `rojo/ball-touch` ).getLastPlayersWhoTouchedTheBall()[0] );
  teamThatShouldKick = lastPlayerThatTouchTheBall.team == 1 ? 2 : 1;

  if ( currentMap.rules.goalKick && ball.x > currentMap.width && lastPlayerThatTouchTheBall.team == Team.RED ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : currentMap.goalKick.x + ball.radius, y : currentMap.goalKick.y } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : currentMap.goalKick.x + ball.radius, y : -currentMap.goalKick.y } );
    room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defblue, style : "bold", sound : 1 });
    Object.assign( ball, { color : colors.blue } );
  }
  else if ( currentMap.rules.goalKick && ball.x < -currentMap.width && lastPlayerThatTouchTheBall.team == Team.BLUE ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : -currentMap.goalKick.x - ball.radius, y : currentMap.goalKick.y } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -currentMap.goalKick.x - ball.radius, y : -currentMap.goalKick.y } );
    room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defred, style : "bold", sound : 1 });
    Object.assign( ball, { color : colors.red } );
  }
  else if ( currentMap.rules.corner && ball.x > currentMap.width && lastPlayerThatTouchTheBall.team == Team.BLUE ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : inv_fun_x.x * ball.radius * Math.sqrt( 2 ) + currentMap.corner.x, y : inv_fun_x.y * ball.radius * Math.sqrt( 2 ) + currentMap.corner.y} );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -fun_x.x * ball.radius * Math.sqrt( 2 ) + currentMap.corner.x, y : -fun_x.y * ball.radius * Math.sqrt( 2 ) - currentMap.corner.y} );
    room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defred, style : "bold", sound : 1 });
   Object.assign( ball, { color : colors.red } );
  }
  else if ( currentMap.rules.corner && ball.x < -currentMap.width && lastPlayerThatTouchTheBall.team == Team.RED ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : fun_x.x * ball.radius * Math.sqrt( 2 ) - currentMap.corner.x, y : fun_x.y * ball.radius * Math.sqrt( 2 ) + currentMap.corner.y} );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -inv_fun_x.x * ball.radius * Math.sqrt( 2 ) - currentMap.corner.x, y : -inv_fun_x.y * ball.radius * Math.sqrt( 2 ) - currentMap.corner.y} );
    room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defblue, style : "bold", sound : 1 });
    Object.assign( ball, { color : colors.blue } );
  }
  else if ( currentMap.rules.meta ) {
    // room.sendAnnouncement( "[DEBUG] Lateral" ); // DEBUG
    if ( ball.y > 0 ) Object.assign( ball, { y : currentMap.corner.y - ball.radius } );
    else if ( ball.y < 0 ) Object.assign( ball, { y : -currentMap.corner.y + ball.radius } );
    if ( lastPlayerThatTouchTheBall.team == Team.RED ) {
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐁𝐥𝐮𝐞 🔵`, undefined, { prefix: `𝐁`, color : colors.defblue, style : "bold", sound : 1 });
      Object.assign( ball, { color : colors.blue } );
    }
    else if ( lastPlayerThatTouchTheBall.team == Team.BLUE ) {
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐝 🔴`, undefined, { prefix: `𝐑`, color : colors.defred, style : "bold", sound : 1 });
      Object.assign( ball, { color : colors.red } );
    }
  }
  Object.assign(ball, { xspeed : 0, yspeed : 0 });
  room.setDiscProperties( 0, ball );
  lastBallPosition = {...ball};
  delete lastBallPosition.color;
}

function onBallJoin ( ball ) {
  if ( badServe ) return;
  if ( ball.x < currentMap.width && ball.x > -currentMap.width ) {
    if ( !kickBallBehindTheLine ) {
      room.sendAnnouncement(`Mal sacado`, undefined, { prefix: `🚫`, color : colors.orange, style : "bold", sound : 1 });
      badServe = true;
      teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
      returnBall( teamThatShouldKick );
    }
    else {
      kickBallBehindTheLine = false;
    }
  }
}

function onBallIsOut ( ball ) {
  if ( badServe ) return;
  if ( kickBallBehindTheLine ) {
    if ( Math.sqrt( Math.pow( ball.x - lastBallPosition.x, 2 ) + Math.pow( ball.y - lastBallPosition.y, 2 ) ) >= config.tolerance ) {
      room.sendAnnouncement(`Mal sacado`, undefined, { prefix: `🚫`, color : colors.orange, style : "bold", sound : 1 });
      badServe = true;
      kickBallBehindTheLine = false;
      teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
      returnBall( teamThatShouldKick );
    }
  }
}

function checkBallPosition () {
  let ball = room.getDiscProperties(0);
  if ( isOutsideStadium( ball ) ) {
    if ( !isBallOutsideStadium ) {
      isBallOutsideStadium = true;
      onBallLeft( ball );
    }
    else {
      onBallIsOut( ball );
    }
  }
  else {
    if ( isBallOutsideStadium ) {
      onBallJoin( ball );
      isBallOutsideStadium = false;
      // clearInterval( temp );
      room.setDiscProperties( 0, { color : colors.white } );
    }
  }
}

function returnBall ( team ) {
  room.setDiscProperties( 0, lastBallPosition );
  setTimeout( () => { 
    if ( team == Team.BLUE ) {
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐁𝐥𝐮𝐞 🔵`, undefined, { prefix: `𝐁`, color : colors.defblue, style : "bold", sound : 1 });
      room.setDiscProperties( 0, { color : colors.blue } );
    }
    else if ( team == Team.RED ) {
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐝 🔴`, undefined, { prefix: `𝐑`, color : colors.defred, style : "bold", sound : 1 });
      room.setDiscProperties( 0, { color : colors.red } );
    }
    badServe = false 
  }, 50 );
}

function onPlayerTouchTheBallHandler ( playerId, eventName ) {
  if ( badServe ) return;
  if ( isBallOutsideStadium ) {
    let ballPosition = room.getBallPosition();
    if ( ballPosition.x < currentMap.width && ballPosition.x > -currentMap.width ) {
      let player = room.getPlayer( playerId );
      if ( player.team != teamThatShouldKick ) {
        room.sendAnnouncement(`Falta ${player.name} 📒`, undefined, { prefix: `❕`, color : colors.orange, style : "bold", sound : 1 });
        room.setPlayerTeam( player.id, 0 );
        room.setPlayerTeam( player.id, (teamThatShouldKick == 1 ? 2 : 1) );
        badServe = true;
        returnBall( teamThatShouldKick );
      }
      else if ( player.team == teamThatShouldKick ) {
        if ( kickBallBehindTheLine && lastPlayerThatTouchTheBall.id != player.id ) {
          room.sendAnnouncement(`Mal sacado`, undefined, { prefix: `🚫`, color : colors.orange, style : "bold", sound : 1 });
          badServe = true;
          teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
          returnBall( teamThatShouldKick );
        }
        else if ( eventName == "onPlayerBallKick" ) {
          lastPlayerThatTouchTheBall = player;
          kickBallBehindTheLine = true;
        }
        else if ( Math.sqrt( Math.pow( ballPosition.x - lastBallPosition.x, 2 ) + Math.pow( ballPosition.y - lastBallPosition.y, 2 ) ) >= config.tolerance ) {
          room.sendAnnouncement(`Mal sacado`, undefined, { prefix: `🚫`, color : colors.orange, style : "bold", sound : 1 });
          badServe = true;
          teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
          returnBall( teamThatShouldKick );
        }
      }
    }
  }
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

room.onRoomLink = function onRoomLink () {
  room.onStadiumChange = onStadiumChangeHandler;
  room.onGameTick = onGameTickHandler;
  room.onPlayerTouchTheBall = onPlayerTouchTheBallHandler;
}

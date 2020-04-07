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

let kickBallBehindTheLine = false;

let state = 0;

let states = {
  KICK_OFF : 0, // saque de salida
  IN_GAME : 1, // saque de salida
  THROW_IN : 2, // saque de banda
  GOAL_KICK : 3, // saque de meta
  CORNER_KICK : 4, // saque de esquina
  IN_GOAL : 5, // dentro de la porteria (gol)
  FOUL : false,
  BAD_SERVE : false,
}

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

function setBallProperties ( ball ) {
  let color;
  if ( state == states.CORNER_KICK ) {
    if ( teamThatShouldKick == Team.RED ) {
      color = colors.red;
      room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defred, style : "bold", sound : 1 });
    }
    else if ( teamThatShouldKick == Team.BLUE ) {
      color = colors.blue;
      room.sendAnnouncement(`𝐂𝐨𝐫𝐧𝐞𝐫`, undefined, { prefix: `🚩`, color : colors.defblue, style : "bold", sound : 1 });
    }
  }
  if ( state == states.GOAL_KICK ) {
    if ( teamThatShouldKick == Team.RED ) {
      color = colors.red;
      room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defred, style : "bold", sound : 1 });
    }
    else if ( teamThatShouldKick == Team.BLUE ) {
      color = colors.blue;
      room.sendAnnouncement(`𝐒𝐚𝐪𝐮𝐞 𝐝𝐞 𝐚𝐫𝐜𝐨`, undefined, { prefix: `⚽`, color : colors.defblue, style : "bold", sound : 1 });
    }
  }
  if ( state == states.THROW_IN ) {
    if ( teamThatShouldKick == Team.RED ) {
      color = colors.red;
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐝 🔴`, undefined, { prefix: `𝐑`, color : colors.defred, style : "bold", sound : 1 });
    }
    else if ( teamThatShouldKick == Team.BLUE ) {
      color = colors.blue;
      room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐁𝐥𝐮𝐞 🔵`, undefined, { prefix: `𝐁`, color : colors.defblue, style : "bold", sound : 1 });
    }
  }
  room.setDiscProperties( 0, Object.assign( {}, ball, { color : color } ) );
}

function onBallLeft ( ball ) {

  // temp = setInterval( function () { match.extraTime++ }, 1000 );
  let ballPosition;
  teamThatShouldKick = room.getPlayer( room.getPlugin( `rojo/ball-touch` ).getLastPlayersWhoTouchedTheBall()[0] ).team == 1 ? 2 : 1;

  if ( currentMap.rules.goalKick && ball.x > currentMap.width && teamThatShouldKick == Team.BLUE ) {
    state = states.GOAL_KICK;
    if ( ball.y > currentMap.goalLine.y ) ballPosition = { x : currentMap.goalKick.x + ball.radius, y : currentMap.goalKick.y };
    else if ( ball.y < -currentMap.goalLine.y ) ballPosition = { x : currentMap.goalKick.x + ball.radius, y : -currentMap.goalKick.y };
  }
  else if ( currentMap.rules.goalKick && ball.x < -currentMap.width && teamThatShouldKick == Team.RED ) {
    state = states.GOAL_KICK;
    if ( ball.y > currentMap.goalLine.y ) ballPosition = { x : -currentMap.goalKick.x - ball.radius, y : currentMap.goalKick.y };
    else if ( ball.y < -currentMap.goalLine.y ) ballPosition = { x : -currentMap.goalKick.x - ball.radius, y : -currentMap.goalKick.y };
  }
  else if ( currentMap.rules.corner && ball.x > currentMap.width && teamThatShouldKick == Team.RED ) {
    state = states.CORNER_KICK;
    if ( ball.y > currentMap.goalLine.y ) ballPosition = { x : inv_fun_x.x * ball.radius * Math.SQRT2 + currentMap.corner.x, y : inv_fun_x.y * ball.radius * Math.SQRT2 + currentMap.corner.y};
    else if ( ball.y < -currentMap.goalLine.y ) ballPosition = { x : -fun_x.x * ball.radius * Math.SQRT2 + currentMap.corner.x, y : -fun_x.y * ball.radius * Math.SQRT2 - currentMap.corner.y};
  }
  else if ( currentMap.rules.corner && ball.x < -currentMap.width && teamThatShouldKick == Team.BLUE ) {
    state = states.CORNER_KICK;
    if ( ball.y > currentMap.goalLine.y ) ballPosition = { x : fun_x.x * ball.radius * Math.SQRT2 - currentMap.corner.x, y : fun_x.y * ball.radius * Math.SQRT2 + currentMap.corner.y};
    else if ( ball.y < -currentMap.goalLine.y ) ballPosition = { x : -inv_fun_x.x * ball.radius * Math.SQRT2 - currentMap.corner.x, y : -inv_fun_x.y * ball.radius * Math.SQRT2 - currentMap.corner.y};
  }
  else if ( currentMap.rules.meta ) {
    state = states.THROW_IN;
    if ( ball.y > 0 ) ballPosition = { y : currentMap.corner.y - ball.radius };
    else if ( ball.y < 0 ) ballPosition = { y : -currentMap.corner.y + ball.radius };
  }

  lastBallPosition = Object.assign( {}, ball, ballPosition, { xspeed : 0, yspeed : 0 } );
  setBallProperties( lastBallPosition );
  console.log( `[DEBUG] BALL IS OUTSIDE` ); // DEBUG
}

function returnBall ( team ) {
  room.setDiscProperties( 0, lastBallPosition );
  if ( team == Team.BLUE ) {
    room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐁𝐥𝐮𝐞 🔵`, undefined, { prefix: `𝐁`, color : colors.defblue, style : "bold", sound : 1 });
    room.setDiscProperties( 0, { color : colors.blue } );
  }
  else if ( team == Team.RED ) {
    room.sendAnnouncement(`𝐋𝐚𝐭𝐞𝐫𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐝 🔴`, undefined, { prefix: `𝐑`, color : colors.defred, style : "bold", sound : 1 });
    room.setDiscProperties( 0, { color : colors.red } );
  }
}

function asd () {
  if ( states.BAD_SERVE ) {
    teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
    room.sendAnnouncement(`𝐌𝐚𝐥 𝐬𝐚𝐜𝐚𝐝𝐨`, undefined, { prefix: `🚫`, color : colors.orange, style : "bold", sound : 1 });
    console.log( `[DEBUG] PROCESING BAD SERVE` ); // DEBUG
  }
  else if ( states.FOUL ) {
    let player = {...states.FOUL};
    room.setPlayerTeam( player.id, 0 );
    room.setPlayerTeam( player.id, player.team );
    room.sendAnnouncement(`𝐅𝐚𝐥𝐭𝐚 ${player.name} 📒`, undefined, { prefix: `❕`, color : colors.orange, style : "bold", sound : 1 });
    /*...*/
    console.log( `[DEBUG] PROCESING FOUL` ); // DEBUG
  }
  kickBallBehindTheLine = false;
  returnBall( teamThatShouldKick );
  states.BAD_SERVE = false;
  states.FOUL = false;
  lastPlayerThatTouchTheBall = false;
}

function onBallJoin( ball ) {
  // room.setDiscProperties( 0, { color : colors.white } );
  if ( state == states.THROW_IN ) {
    if ( !kickBallBehindTheLine ) {
      states.BAD_SERVE = true;
      console.log( `[DEBUG] BAD SERVER ( onBallJoin )` ); // DEBUG
    }
  }
  if ( !states.BAD_SERVE ) {
    room.setDiscProperties( 0, { color : colors.white } );
    kickBallBehindTheLine = false;
    lastPlayerThatTouchTheBall = false;
    state = states.IN_GAME;
    states.BAD_SERVE = false;
    states.FOUL = false;
    console.log( `[DEBUG] BALL IN GAME` ); // DEBUG
  }
}

function onBallIsOut( ball ) {
  if ( state == states.THROW_IN ) {
    if ( Math.sqrt( Math.pow( ball.x - lastBallPosition.x, 2 ) + Math.pow( ball.y - lastBallPosition.y, 2 ) ) >= config.tolerance ) {
      states.BAD_SERVE = true;
      console.log( `[DEBUG] BAD SERVER ( onBallIsOut )` ); // DEBUG
    }
  }
}

function checkBallPosition () {
  if ( state != states.KICK_OFF & states.IN_GOAL ) {
    if ( states.BAD_SERVE || states.FOUL ) return asd()/*...*/;
    let ball = room.getDiscProperties(0);
    if ( isOutsideStadium( ball ) ) {
      if ( state == states.IN_GAME ) onBallLeft( ball );
      else onBallIsOut( ball );
    }
    else {
      if ( state != states.IN_GAME ) onBallJoin( ball );
      // else do something
    }
  }
}

function onPlayerTouchTheBallHandler ( player, event ) {
  if ( state == states.KICK_OFF ) state = states.IN_GAME;
  // if ( state != states.IN_GAME ) do something..
  if ( states.BAD_SERVE || states.FOUL ) setTimeout( () => { return; },50 );
  else if ( state == states.THROW_IN ) {
    if ( player.team != teamThatShouldKick ) {
      states.FOUL = player;
      console.log( `[DEBUG] FOUL` ); // DEBUG
    }
    else if ( player.team == teamThatShouldKick ) {
      if ( kickBallBehindTheLine && lastPlayerThatTouchTheBall.id != player.id ) {
        states.BAD_SERVE = true;
        console.log( `[DEBUG] BAD SERVER ( onPlayerTouchTheBallHandler )` ); // DEBUG
      }
      else if ( event == 'onPlayerBallKick') {
        lastPlayerThatTouchTheBall = player;
        kickBallBehindTheLine = true;
        console.log( `[DEBUG] PLAYER KICK THE BALL BEHING THE LINE` ); // DEBUG
      }
    }
  }
}

function onGameTickHandler () {
  if ( !customRSMap ) return;
  checkBallPosition();
}

function onGameStartHandler () {
  if ( !customRSMap ) return;
  state = states.KICK_OFF;
}

function onGameStopHandler () {
  if ( !customRSMap ) return;
  state = states.KICK_OFF;
}

function onTeamGoalHandler ( team ) {
  if ( !customRSMap ) return;
  state = states.IN_GOAL;
}

function onPositionsResetHandler () {
  if ( !customRSMap ) return;
  state = states.KICK_OFF;
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
  room.onPositionsReset = onPositionsResetHandler;
  room.onGameStop =  onGameStopHandler;
  room.onGameStart = onGameStartHandler;
  room.onTeamGoal = onTeamGoalHandler;
}


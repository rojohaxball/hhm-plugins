var room = HBInit();

room.pluginSpec = {
  name: `rojo/referee`,
  author: `rojo`,
  version: `1.0.0`,
  config: {
    tolerance : 100,
    punishment : true,
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
const getLastPlayersWhoTouchedTheBall = room.getPlugin( `rojo/ball-touch` ).getLastPlayersWhoTouchedTheBall;

const fun_x = { x : Math.cos( Math.PI / 4 ), y : Math.sin( Math.PI / 4 ) };
const inv_fun_x = { x : Math.cos( Math.PI / 4 * 3), y : Math.sin( Math.PI / 4 * 3) };

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

let teamThatShouldKick;

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

  if ( ( ball.y < currentMap.goalLine.y && ball.y > -currentMap.goalLine.y ) && ( ball.x > currentMap.width || ball.x < -currentMap.width ) ) {
    // room.sendAnnouncement( `[DEBUG] ball state : 'IN_GOAL'` ); // DEBUG
    state = states.IN_GOAL;
    return;
  }

  teamThatShouldKick = room.getPlayer( getLastPlayersWhoTouchedTheBall()[0] ).team == 1 ? 2 : 1;

  if ( currentMap.rules.goalKick && ball.x > currentMap.width && teamThatShouldKick == Team.BLUE ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : currentMap.goalKick.x + ball.radius, y : currentMap.goalKick.y, color : colors.blue, xspeed : 0, yspeed : 0 } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : currentMap.goalKick.x + ball.radius, y : -currentMap.goalKick.y, color : colors.blue, xspeed : 0, yspeed : 0 } );
    room.sendAnnouncement( `[ARBITRO] SAQUE DE ARCO` );
    // room.sendAnnouncement( `[DEBUG] ball state : 'GOAL_KICK'` ); // DEBUG
    state = states.GOAL_KICK;
  }
  else if ( currentMap.rules.goalKick && ball.x < -currentMap.width && teamThatShouldKick == Team.RED ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : -currentMap.goalKick.x - ball.radius, y : currentMap.goalKick.y, color : colors.red, xspeed : 0, yspeed : 0 } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -currentMap.goalKick.x - ball.radius, y : -currentMap.goalKick.y, color : colors.red, xspeed : 0, yspeed : 0 } );
   room.sendAnnouncement( `[ARBITRO] SAQUE DE ARCO` );
    //  room.sendAnnouncement( `[DEBUG] ball state : 'GOAL_KICK'` ); // DEBUG
    state = states.GOAL_KICK;
  }
  else if ( currentMap.rules.corner && ball.x > currentMap.width && teamThatShouldKick == Team.RED ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : inv_fun_x.x * ball.radius * Math.SQRT2 + currentMap.corner.x, y : inv_fun_x.y * ball.radius * Math.SQRT2 + currentMap.corner.y, color : colors.red, xspeed : 0, yspeed : 0 } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -fun_x.x * ball.radius * Math.SQRT2 + currentMap.corner.x, y : -fun_x.y * ball.radius * Math.SQRT2 - currentMap.corner.y, color : colors.red, xspeed : 0, yspeed : 0 } );
    room.sendAnnouncement( `[ARBITRO] CORNER` );
    // room.sendAnnouncement( `[DEBUG] ball state : 'CORNER_KICK'` ); // DEBUG
    state = states.CORNER_KICK;
  }
  else if ( currentMap.rules.corner && ball.x < -currentMap.width && teamThatShouldKick == Team.BLUE ) {
    if ( ball.y > currentMap.goalLine.y ) Object.assign( ball, { x : fun_x.x * ball.radius * Math.SQRT2 - currentMap.corner.x, y : fun_x.y * ball.radius * Math.SQRT2 + currentMap.corner.y, color : colors.blue, xspeed : 0, yspeed : 0 } );
    else if ( ball.y < -currentMap.goalLine.y ) Object.assign( ball, { x : -inv_fun_x.x * ball.radius * Math.SQRT2 - currentMap.corner.x, y : -inv_fun_x.y * ball.radius * Math.SQRT2 - currentMap.corner.y, color : colors.blue, xspeed : 0, yspeed : 0 } );
    room.sendAnnouncement( `[ARBITRO] CORNER` );
    // room.sendAnnouncement( `[DEBUG] ball state : 'CORNER_KICK'` ); // DEBUG
    state = states.CORNER_KICK;
    }
  else if ( currentMap.rules.meta ) {
    if ( ball.y > 0 ) Object.assign( ball, { y : currentMap.corner.y - ball.radius, xspeed : 0, yspeed : 0, color : ( teamThatShouldKick == Team.RED ? colors.red : colors.blue ) } );
    else if ( ball.y < 0 ) Object.assign( ball, { y : -currentMap.corner.y + ball.radius, xspeed : 0, yspeed : 0, color : ( teamThatShouldKick == Team.RED ? colors.red : colors.blue ) } );
    room.sendAnnouncement( `[ARBITRO] LATERAL` );
    // room.sendAnnouncement( `[DEBUG] ball state : 'THROW_IN'` ); // DEBUG
    state = states.THROW_IN;
  }

  room.setDiscProperties( 0, ball );
  lastBallPosition = {...ball};
}

let flag = false;

function returnBall () {
  if ( !flag ) {
    flag = true;
    setTimeout( () => {
      if ( states.BAD_SERVE ) {
        room.sendAnnouncement( `[ARBITRO] MAL SACADO` );
        teamThatShouldKick = teamThatShouldKick == 1 ? 2 : 1;
        // room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : false` ); // DEBUG
        states.BAD_SERVE = false;
      }
      else if ( states.FOUL ) {
        room.sendAnnouncement( `[ARBITRO] FALTA ${states.FOUL.id}` );
        if ( config.punishment ) room.setPlayerDiscProperties( states.FOUL.id, { x : 0, y : -lastBallPosition.y } );
        // room.sendAnnouncement( `[DEBUG] ball state 'FOUL' : false` ); // DEBUG
        states.FOUL = false;
      }
      // room.sendAnnouncement( `[DEBUG] ball is return` ); // DEBUG
      room.setDiscProperties( 0, Object.assign( lastBallPosition, { color : ( teamThatShouldKick == Team.RED ? colors.red : colors.blue ) } ) );
      flag = false;
      kickBallBefore = false;
    }, 100 );
  }
  else if ( state == states.THROW_IN ) {
    // console.log ( `[DEBUG] ball state : 'THROW_IN'` ); // DEBUG
  }
}

function onBallIsOut( ball ) {
  if ( state == states.THROW_IN ) {
    if ( Math.sqrt( Math.pow( ball.x - lastBallPosition.x, 2 ) + Math.pow( ball.y - lastBallPosition.y, 2 ) ) >= config.tolerance ) {
      let lastPlayerThatTouchTheBall = room.getPlayer( getLastPlayersWhoTouchedTheBall()[0] );
      if ( !kickBallBefore && lastPlayerThatTouchTheBall.team != teamThatShouldKick ) {
        states.FOUL = lastPlayerThatTouchTheBall;
        return;
      }
      // room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : true` ); // DEBUG
      states.BAD_SERVE = true;
    }
  }
}

function onBallJoin( ball ) {
  room.setDiscProperties( 0, { color : colors.white } );
  if ( state == states.THROW_IN ) {
    if ( !kickBallBefore ) {
      // room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : true` ); // DEBUG
      states.BAD_SERVE = true;
      return;
    }
  }
  // room.sendAnnouncement( `[DEBUG] ball state : 'IN_GAME'` ); // DEBUG
  state = states.IN_GAME;
  kickBallBefore = false;
}

function checkBallPosition () {
  if ( state != states.KICK_OFF & states.IN_GOAL ) {
    if ( states.BAD_SERVE || states.FOUL ) return returnBall();
    let ball = room.getDiscProperties(0);
    if ( isOutsideStadium( ball ) ) {
      if ( state == states.IN_GAME ) onBallLeft( ball );
      else onBallIsOut( ball );
    }
    else {
      if ( state != states.IN_GAME ) onBallJoin( ball );
    }
  }
}

let kickBallBefore = false;

function onPlayerTouchTheBallHandler ( player, kick ) {
  if ( !customRSMap ) return;
  if ( state == states.KICK_OFF ) {
    // room.sendAnnouncement( `[DEBUG] ball state : 'IN_GAME'` ); // DEBUG
    state = states.IN_GAME;
  }
  else if ( states.BAD_SERVE || states.FOUL ) {
    if ( state == states.THROW_IN ) {
      // room.sendAnnouncement( `[DEBUG] ball state : 'THROW_IN'` ); // DEBUG
      return;
    }
  }
  else if ( state == states.THROW_IN ) {
    if ( player.team != teamThatShouldKick ) {
      // room.sendAnnouncement( `[DEBUG] ball state 'FOUL' : true` ); // DEBUG
      if ( kickBallBefore || kick ) states.FOUL = player;
    }
    else if ( player.team == teamThatShouldKick ) {
      if ( kickBallBefore && kickBallBefore.id != player.id ) {
        lastBallPosition.x = player.position.x;
        // room.sendAnnouncement( `[DEBUG] ${player.name} touch the ball` ); // DEBUG
        // room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : true` ); // DEBUG
        states.BAD_SERVE = true;
      }
      else if ( kick ) {
        // room.sendAnnouncement( `[DEBUG] ${player.name} kick the ball` ); // DEBUG
        kickBallBefore = player;
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
  // room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` ); // DEBUG
  state = states.KICK_OFF;
}

function onGameStopHandler () {
  if ( !customRSMap ) return;
  // room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` ); // DEBUG
  state = states.KICK_OFF;
}

function onPositionsResetHandler () {
  if ( !customRSMap ) return;
  // room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` ); // DEBUG
  state = states.KICK_OFF;
}

function onStadiumChangeHandler ( newStadiumName, byPlayer ) {
  customRSMap = false;
  currentMap = null;
  for (const [key, value] of Object.entries(rs_maps)) {
    if ( value.name == newStadiumName ) {
      customRSMap = true;
      currentMap = value;
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
}

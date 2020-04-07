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

  if ( ( ball.y < currentMap.goalLine.y && ball.y > -currentMap.goalLine.y ) && ( lastBallPosition.x > currentMap.width || lastBallPosition.x < -currentMap.width ) ) {
    state = states.IN_GOAL;
    return; // if the ball passes the goal
  }

  teamThatShouldKick = room.getPlayer( room.getPlugin( `rojo/ball-touch` ).getLastPlayersWhoTouchedTheBall()[0] ).team == 1 ? 2 : 1;

  if ( currentMap.rules.goalKick && ball.x > currentMap.width && teamThatShouldKick == Team.BLUE ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'GOAL_KICK'` );
    state = states.GOAL_KICK;
  }
  else if ( currentMap.rules.goalKick && ball.x < -currentMap.width && teamThatShouldKick == Team.RED ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'GOAL_KICK'` );
    state = states.GOAL_KICK;
  }
  else if ( currentMap.rules.corner && ball.x > currentMap.width && teamThatShouldKick == Team.RED ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'CORNER_KICK'` );
    state = states.CORNER_KICK;
  }
  else if ( currentMap.rules.corner && ball.x < -currentMap.width && teamThatShouldKick == Team.BLUE ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'CORNER_KICK'` );
    state = states.CORNER_KICK;
    }
  else if ( currentMap.rules.meta ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'THROW_IN'` );
    state = states.THROW_IN;
  }
}

function onBallJoin( ball ) {
  room.sendAnnouncement( `[DEBUG] ball state : 'IN_GAME'` );
  state = states.IN_GAME;
}

function checkBallPosition () {
  if ( state != states.KICK_OFF & states.IN_GOAL ) {
    if ( states.BAD_SERVE || states.FOUL ) {
      if ( state == states.THROW_IN ) {
        console.log ( `[DEBUG] ball state : 'THROW_IN'` );
        return;
      }
    }
    let ball = room.getDiscProperties(0);
    if ( isOutsideStadium( ball ) ) {
      if ( state == states.IN_GAME ) onBallLeft( ball );
    }
    else {
      if ( state != states.IN_GAME ) onBallJoin( ball );
    }
  }
}

function onPlayerTouchTheBallHandler ( player, event ) {
  if ( !customRSMap ) return;
  if ( state == states.KICK_OFF ) {
    room.sendAnnouncement( `[DEBUG] ball state : 'IN_GAME'` );
    state = states.IN_GAME;
  }
  else if ( states.BAD_SERVE || states.FOUL ) {
    if ( state == states.THROW_IN ) {
      room.sendAnnouncement( `[DEBUG] ball state : 'THROW_IN'` );
    }
  }
  else if ( state == states.THROW_IN ) {
    if ( player.team != teamThatShouldKick ) {
      room.sendAnnouncement( `[DEBUG] ball state 'FOUL' : true` );
      states.FOUL = true;
		}
    else if ( player.team == teamThatShouldKick ) {
      if ( kickBallBefore ) {
        room.sendAnnouncement( `[DEBUG] ${player.name} touch the ball` );
        room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : true` );
        states.BAD_SERVE = true;
      }
      else if ( event == 'onPlayerBallKick') {
        room.sendAnnouncement( `[DEBUG] ${player.name} kick the ball` );
        kickBallBefore = true;
      }
    }
  }
}

function onGameTickHandler () {
  if ( !customRSMap ) return;
  checkBallPosition();
  if ( states.FOUL ) {
    room.sendAnnouncement( `[DEBUG] ball is set to 0,0` );
    room.setDiscProperties( 0, { x : 0, y : 0, xspeed : 0, yspeed : 0} );
    room.sendAnnouncement( `[DEBUG] ball state 'FOUL' : false` );
    states.FOUL = false;
  }
  if ( states.BAD_SERVE ) {
    room.sendAnnouncement( `[DEBUG] ball is set to 0,0` );
    room.setDiscProperties( 0, { x : 0, y : 0, xspeed : 0, yspeed : 0} );
    room.sendAnnouncement( `[DEBUG] ball state 'BAD_SERVE' : false` );
    states.BAD_SERVE = false;
  }
}

function onGameStartHandler () {
  if ( !customRSMap ) return;
  room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` );
  state = states.KICK_OFF;
}

function onGameStopHandler () {
  if ( !customRSMap ) return;
  room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` );
  state = states.KICK_OFF;
}

function onPositionsResetHandler () {
  if ( !customRSMap ) return;
  room.sendAnnouncement( `[DEBUG] ball state : 'KICK_OFF'` );
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

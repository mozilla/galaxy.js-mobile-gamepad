/*------------------- 
A player entity
-------------------------------- */
var OverworldPlayerEntity = me.ObjectEntity.extend({
 
    isPlayer: true,
    godMode: false,

    init: function(x, y, settings) {
        this.orientation = 'down';

        this.inventory = {};
        this.inventory.ammo = 0;
        this.inventory.keycards = {};

        settings.collidable = true;

        settings.image = 'keen-overworld';
        settings.spritewidth = 12;
        settings.spriteheight = 16;

        this.speed = 2;

        // call the constructor
        this.parent(x, y, settings);

        // set the default horizontal & vertical speed (accel vector)
        this.setVelocity(2.4, 15);
 
        // me.debug.renderHitBox = true;

        // adjust the bounding box
        this.updateColRect(0, 8, 0, 16);
        // x, w, y, h

        // me.game.viewport.setBounds(100, 100);

        // set the display to follow our position on both axis
        me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);

        this.addAnimation ('stand_left', [15]);
        this.addAnimation ('walk_left', [12,13,14,15]);

        this.addAnimation ('stand_right', [6]);
        this.addAnimation ('walk_right', [4,5,6,7]);

        this.addAnimation ('stand_up', [8]);
        this.addAnimation ('walk_up', [8,9,10,11]);

        this.addAnimation ('stand_down', [0]);
        this.addAnimation ('walk_down', [0,1,2,3]);

        this.nonCollidedPos = [];
    },

    update: function(){
        this.gravity = 0;

        var res = me.game.collide( this );
        /*
        if ( res && res.obj.solid ) {
            // this.vel.x = 0;
            // this.vel.y = 0;
            this.pos.x = this.nonCollidedPos[4].x;
            this.pos.y = this.nonCollidedPos[4].y;

            console.log( this.nonCollidedPos[4].x );

            this.parent( this );
            this.updateMovement();
            return false;
        } else {
            this.nonCollidedPos.push( this.pos );

            // this.nonCollidedPos = {x: 230, y: 580};
        } */

        if ( me.input.isKeyPressed('left') ) {

            this.setCurrentAnimation('walk_left');
            this.orientation = 'left';

            // update the entity velocity
            this.vel.x = -this.speed;
        } else if ( me.input.isKeyPressed('right') ) {

            this.setCurrentAnimation('walk_right');
            this.orientation = 'right';

            // update the entity velocity
            this.vel.x = this.speed;
        } else {
            this.vel.x = 0;
        }

        if ( me.input.isKeyPressed('up') ) {

            this.setCurrentAnimation('walk_up');
            this.orientation = 'up';

            // update the entity velocity
            this.vel.y = -this.speed;
        } else if ( me.input.isKeyPressed('down') ) {

            this.setCurrentAnimation('walk_down');
            this.orientation = 'down';

            // update the entity velocity
            this.vel.y = this.speed;
        } else {
            this.vel.y = 0;
        }

        this.setCurrentAnimation( 'walk_' + this.orientation );

        if ( !me.input.isKeyPressed('left') && !me.input.isKeyPressed('right') && !me.input.isKeyPressed('up') && !me.input.isKeyPressed('down') ) {
            this.setCurrentAnimation( 'stand_' + this.orientation );
            this.vel.x = 0;
            this.vel.y = 0;
        }

        if ( res && res.obj.levelname && ( me.input.isKeyPressed('jump')|| me.input.isKeyPressed('fire')|| me.input.isKeyPressed('pogo') ) ) {

            KeenLevelLoader( res.obj.levelname );
        }

        // check & update player movement
        this.updateMovement();
 
        // update animation if necessary
        if (this.vel.x!=0 || this.vel.y!=0) {
            // update objet animation
            this.parent(this);
            return true;
        }
         
        // else inform the engine we did not perform
        // any update (e.g. position, animation)
        return false;
    }

});

var OverworldLevelEntity = me.ObjectEntity.extend({

    init: function(x, y, settings) {
        settings.collidable = true;
        this.levelname = settings.levelname;
        settings.image = 'keen-overworld';
        settings.spritewidth = settings.width;
        settings.spriteheight = settings.height;

        this.parent(x, y, settings);
    },

    update: function(){
        this.alpha = 0;
        this.gravity = 0;

        this.parent( this );
        this.updateMovement();
        return true;
    }

});

var OverworldLevelBlockEntity = me.ObjectEntity.extend({

    solid: true,

    init: function(x, y, settings) {
        settings.collidable = true;
        this.levelname = settings.levelname;
        settings.image = 'keen-overworld';
        settings.spritewidth = settings.width;
        settings.spriteheight = settings.height;

        this.parent(x, y, settings);
    },

    update: function(){
        this.alpha = 0;
        this.gravity = 0;

        this.parent( this );
        this.updateMovement();
        return true;
    }

});

/*------------------- 
A player entity
-------------------------------- */
var PlayerEntity = me.ObjectEntity.extend({
 
    isPlayer: true,
    godMode: false,

    /* -----
    constructor
    ------ */

    init: function(x, y, settings) {

        this.orientation = 'right';

        this.inventory = {};
        this.inventory.ammo = 0;
        this.inventory.keycards = {};

        this.collidable = true;

        settings.image = 'keen';
        settings.spritewidth = 16;
        settings.spriteheight = 24;

        // call the constructor
        this.parent(x, y, settings);
 
        // set the default horizontal & vertical speed (accel vector)
        this.setVelocity(2.4, 15);
 
        // me.debug.renderHitBox = true;

        // adjust the bounding box
        this.updateColRect(2, 10, 1, 23);
        // x, w, y, h

        // me.game.viewport.setBounds(100, 100);

        // set the display to follow our position on both axis
        me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);

        this.addAnimation ('stand_right', [0]);
        this.addAnimation ('walk_right', [1,2,3]);

        this.addAnimation ('stand_left', [6]);
        this.addAnimation ('walk_left', [7,8,9]);

        this.addAnimation ('jump_right', [12,13,14,15,16,17]);
        this.addAnimation ('jump_left', [18,19,20,21,22,23]);

        this.addAnimation ('fall_right', [17]);
        this.addAnimation ('fall_left', [23]);

        this.addAnimation ('shoot_right', [24]);
        this.addAnimation ('shoot_left', [25]);

        this.addAnimation ('pogo_down_right', [4]);
        this.addAnimation ('pogo_up_right', [5]);

        this.addAnimation ('pogo_down_left', [10]);
        this.addAnimation ('pogo_up_left', [11]);

        this.addAnimation ('die', [26,27]);
    },
 
    /* -----
 
    update the player pos
 
    ------ */
    computeVelocity : function(vel) {

        // apply gravity (if any)
        if (this.gravity) {
            // apply a constant gravity (if not on a ladder)
            vel.y += !this.onladder?(this.gravity * me.timer.tick):0;

            // check if falling / jumping
            this.falling = (vel.y > 0);

            if ( this.falling && (this.landing || this.jumping) ) {
                this.landing = true;
            } else {
                this.landing = false;
            }

            this.jumping = this.falling?false:this.jumping;
        }

        // apply friction
        if (this.friction.x)
            vel.x = me.utils.applyFriction(vel.x,this.friction.x);
        if (this.friction.y)
            vel.y = me.utils.applyFriction(vel.y,this.friction.y);

        // cap velocity
        if (vel.y !=0)
            vel.y = vel.y.clamp(-this.maxVel.y,this.maxVel.y);
        if (vel.x !=0)
        vel.x = vel.x.clamp(-this.maxVel.x,this.maxVel.x);
    },

    update: function() {
        jsApp.mainPlayer = me.game.getEntityByName("mainPlayer")[0];

        // check for collision
        var res = me.game.collide(this);
        // check for collision
        var collision = this.collisionMap.checkCollision(this.collisionBox, this.vel);

        if (res && res.obj.deadly && this.alive && !this.godMode ) {
            this.die();
        }

        if ( this.exiting ) {
            this.vel.x = 0.7;
            this.setCurrentAnimation('walk_right');

            if ( this.framesSinceExitCollision > 50 ) {
                this.visible = false;
                me.game.remove( this.exitOverlay );

                if ( this.framesSinceExitCollision > 100 ) {
                    this.exiting = false;
                    KeenLevelLoader('mars');
                    return true;
                    // me.game.viewport.fadeOut('#FF0000', 250, function(){ });
                }

            }

            this.framesSinceExitCollision++;

            this.parent( this );
            this.updateMovement();

            return true;
        }

        if ( !this.alive ) {

            this.vel.x = 0;
            this.vel.y = 0;
            this.gravity = 0;

            if ( this.framesSinceDeath > 90 ) {
                // me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);

                me.game.viewport.follow(this.invisibleDeadKeen);

                if (this.pos.y < 0) {
                    // Reload level when player is off screen
                    KeenLevelLoader('mars');
                }



                if ( this.randomBool ) {
                    this.pos.x += 1;
                } else {
                    this.pos.x -= 1;                    
                }
                this.pos.y -= 4;
            }

            this.framesSinceDeath++;
            this.parent(this);
            this.updateMovement();
            return true;
        }

        if ( me.input.isKeyPressed('pogo') && this.inventory.pogo ) {
            this.previousvel = {};

            if ( !this.vel.y && !this.pogoing) {
                this.gravity = 0.15;
                this.vel.y = -4 * me.timer.tick;
                me.audio.play('jump');
            }
            this.pogoing = !this.pogoing;
        }

        if ( this.pogoing ) {

       if ( me.input.isKeyPressed('jump') && this.godMode ) {
            this.vel.y--;
            // this.updateMovement();
            // return true;
        }

            if (me.input.isKeyPressed('left')) {
                
                
                // update the entity velocity
                this.vel.x -= 0.3;
                this.previousvel.x = 0;

                if ( !this.vel.x ) {
                    this.vel.x = -1;
                }
            } else if (me.input.isKeyPressed('right')) {
                // update the entity velocity
                this.vel.x += 0.3;
                this.previousvel.x = 0;

                if ( !this.vel.x ) {
                    this.vel.x = 1;
                }
            }

            if ( this.pogoDownFrameCount > 10 ) {
                this.pogoDownFrameCount = 0;
                this.gravity = 0.15;
                this.vel.y = -4 * me.timer.tick;


                this.vel.x = this.previousvel.x * 0.9;

                // set the jumping flag
                this.jumping = true;

                // play some audio
                me.audio.play('jump');
            } else {

                if ( this.pogoDownFrameCount ) {
                    this.pogoDownFrameCount++;

                    if ( !this.previousvel.x ) {
                        this.previousvel.x = this.vel.x;
                    }

                    this.vel.x = 0;
                }

            }

            if ( collision.y > 0 && !this.falling ) {
                // Pogo land
                this.vel.y = 0;
                this.pogoDownFrameCount = 1;
            }

            if ( this.vel.x > 0 ) {
                this.orientation = 'right';
            } else if ( this.vel.x < 0 ) {
                this.orientation = 'left';
            }

            if ( this.pogoDownFrameCount ) {
                if ( this.orientation == 'left' ) {
                    this.setCurrentAnimation('pogo_down_left');
                } else {
                    this.setCurrentAnimation('pogo_down_right');
                }
            } else {
                if ( this.orientation == 'left' ) {
                    this.setCurrentAnimation('pogo_up_left');
                } else {
                    this.setCurrentAnimation('pogo_up_right');
                }
            }

            this.parent(this);
            this.updateMovement();
            return true;
        }

        if ( collision.y ) {

            if (collision.y > 0 && !this.falling) {
                me.audio.play('land');
                me.audio.stop('fall');
                this.fallingSound = false;
                this.falling = false;
                this.landing = false;
                this.bumpedHead = false;
            }

            if (collision.yprop.type != 'platform' && collision.y < 0) {
                me.audio.play("head-bump");
                this.falling = true;
                this.landing = true;
                this.bumpedHead = true;
            }
        }

        if ( this.falling && !this.fallingSound && !this.landing && !this.bumpedHead ) {
            me.audio.play('fall');
            this.fallingSound = true;
        }
     
        if (me.input.isKeyPressed('left')) {

            this.setCurrentAnimation('walk_left');

            // update the entity velocity
            this.vel.x -= this.accel.x * me.timer.tick;
            this.orientation = 'left';
        } else if ( me.input.isKeyPressed('right') ) {

            this.setCurrentAnimation('walk_right');

            // update the entity velocity
            this.vel.x += this.accel.x * me.timer.tick;
            this.orientation = 'right';
        } else {
            
            
            if ( this.landing || this.jumping ) {
                // falling no input
                this.vel.x = this.vel.x * 0.75;
            } else {
                this.vel.x = 0;
            }

            
            if ( this.orientation == 'left' ) {
                this.setCurrentAnimation('stand_left');
            } else {
                this.setCurrentAnimation('stand_right');
            }

            // this.updateMovement();
            // return true;
        }

        if ( me.input.isKeyPressed('jump') ) {

            if (!this.jumping && !this.falling) {


                // set current vel to the maximum defined value
                // gravity will then do the rest
                this.gravity = 0.15;

                this.vel.y = -4 * me.timer.tick;

                // set the jumping flag
                this.jumping = true;

                // play some audio
                me.audio.play("jump");


            }
        }

       if ( me.input.isKeyPressed('c') && me.input.isKeyPressed('t') && me.input.isKeyPressed('fire') ) {
            // The C T Space cheat
            this.inventory.pogo = true;
            this.inventory.keycards = {'a': true, 'b': true, 'c': true, 'd': true};
            this.inventory.ammo = 100;
            console.log( 'You are now cheating! You just got a pogo stick, all the key cards, and lots of ray gun charges.' );
        }

        if ( ( me.input.isKeyPressed('jump') && me.input.isKeyPressed('pogo') ) || me.input.isKeyPressed('fire') ) {
        // Shooting
            this.shooting = true;

            if ( this.inventory.ammo ) {
                var bullet = new BulletEntity(this.pos.x, this.pos.y + 5, { image:'bullet', spritewidth: 16, direction: this.orientation }); // don't forget that the objectEntity constructor need parameters 
                me.game.add(bullet, this.z); // it's better to specify the z value of the emitter object, so that both objects are on the same plan 
                me.game.sort(); // sort the object array internally
                me.audio.play('shoot');
                this.inventory.ammo--;
            } else {
                me.audio.play('shoot-empty');
            }

        } // END shooting


        if (this.shooting) {


            if ( this.vel.y == 0 && this.framesSinceFirstShot < 15) {
                this.vel.x = 0;
            } else {
                this.shooting = false;
            }

            if ( this.orientation == 'left' ) {
                this.setCurrentAnimation("shoot_left");
            } else {
                this.setCurrentAnimation('shoot_right');
            }

            this.framesSinceFirstShot += 1;

        } else {
            this.framesSinceFirstShot = 0;
        }


        // check & update player movement
        this.updateMovement();
     
        if ( this.vel.y != 0 ) {

            if ( this.orientation == 'left' ) {
                this.setCurrentAnimation('fall_left');
            } else {
                this.setCurrentAnimation('fall_right');
            }

        } else  {

        }

        // update animation if necessary
        if (this.vel.x != 0 || this.vel.y != 0) {
            // update objet animation
            this.parent(this);
            return true;
        }

        // else inform the engine we did not perform
        // any update (e.g. position, animation)
        return false;       
     
    },

    die: function() {
        this.alive = false;
        me.audio.play( 'die' );
        this.framesSinceDeath = 1;
        this.setCurrentAnimation('die');


        this.invisibleDeadKeen = new me.ObjectEntity(this.pos.x, this.pos.y, {image: 'keen', spritewidth: 10, spriteheight: 10} );
        this.invisibleDeadKeen.visible = false;
        me.game.add(this.invisibleDeadKeen, this.z); // it's better to specify the z value of the emitter object, so that both objects are on the same plan 
        me.game.sort(); // sort the object array internally

        this.randomBool = !! Math.round(Math.random() * 1);
    },

    exit: function( exit ) {
        if ( this.pogoing ) {
            return true;
        }
        me.audio.play('exit');
        this.exiting = true;
        this.framesSinceExitCollision = 0;

        this.exitOverlay = new me.SpriteObject( exit.pos.x + 32, exit.pos.y - 36, me.loader.getImage('exit-overlay'), 33, 38 );
        me.game.add( this.exitOverlay, this.z + 1); // it's better to specify the z value of the emitter object, so that both objects are on the same plan 
        me.game.sort(); // sort the object array internally
    }
 
});

var ExitEntity = me.InvisibleEntity.extend({

    init: function(x, y, settings) {

        settings.image = 'keen';
        settings.width = 16;
        settings.height = 1;

        this.parent(x, y, settings);

        this.pos.y += 30;

        this.collidable = true;

    },

    onCollision: function(res, obj) {
        
        if ( obj && obj.exit && !obj.exiting ) {
            obj.exit( this );
        }

        this.parent(res, obj);
    },

    update: function() {
        this.parent();
        return true;
    }

});

/*----------------
 KeenCollectable entity
------------------------ */
var KeenCollectableEntity = me.CollectableEntity.extend({
    scoreValue: 0,
    sound: 'collect',
    niceName: 'Collectable',
    // extending the init function is not mandatory
    // unless you need to add some extra initialization
    init: function(x, y, settings) {
        this.collidable = false;

        settings.image = this.spriteimage;
        settings.spritewidth = this.spritewidth;

        // call the parent constructor
        this.parent(x, y, settings);

    },
 
    // this function is called by the engine, when
    // an object is touched by something (here collected)
    onCollision : function (res, obj) {
        if (!obj.isPlayer || !obj.alive) {
            return;
        }
        // do something when collide
        me.audio.play( this.sound );

        // give some score
        me.game.HUD.updateItemValue("score", this.scoreValue);

        // make sure it cannot be collected "again"
        // this.collidable = false;

        // remove it
        me.game.remove(this);
    }
 
});

/*----------------
 Lollipop entity
------------------------ */
var LollipopEntity = KeenCollectableEntity.extend({
    niceName: 'Lollipop',
    scoreValue: 100,
    spriteimage: 'lollipop',
    spritewidth: 16,
});

/*----------------
 Soda entity
------------------------ */
var SodaEntity = KeenCollectableEntity.extend({
    niceName: 'Soda',
    scoreValue: 200,
    spriteimage: 'soda',
    spritewidth: 12
});

/*----------------
 Pizza entity
------------------------ */
var PizzaEntity = KeenCollectableEntity.extend({
    niceName: 'Pizza',
    scoreValue: 500,
    spriteimage: 'pizza',
    spritewidth: 16
});

/*----------------
 Book entity
------------------------ */
var BookEntity = KeenCollectableEntity.extend({
    niceName: 'Book',
    scoreValue: 1000,
    spriteimage: 'book',
    spritewidth: 16
});

/*----------------
 Teddy Bear entity
------------------------ */
var TeddyBearEntity = KeenCollectableEntity.extend({
    niceName: 'Teddy Bear',
    scoreValue: 5000,
    spriteimage: 'teddy-bear',
    spritewidth: 16
});

/*----------------
 Raygun entity
------------------------ */
var RaygunEntity = KeenCollectableEntity.extend({
    niceName: 'Raygun',
    sound: 'raygun-collect',
    spriteimage: 'raygun',
    spritewidth: 16, 

    onCollision: function(res, obj) {
        this.parent(res, obj);

        if ( obj.inventory ) {
            obj.inventory.ammo += 5;
        }
    }
});

/*----------------
 Pogo entity
------------------------ */
var PogoEntity = KeenCollectableEntity.extend({
    niceName: 'Pogo stick',
    sound: 'raygun-collect',
    spriteimage: 'pogo-stick',
    spritewidth: 12, 

    onCollision: function(res, obj) {
        this.parent(res, obj);

        if ( obj.inventory ) {
            obj.inventory.pogo = true;
        }
    }
});

/*----------------
 Keycard entity
------------------------ */
var KeycardEntity = KeenCollectableEntity.extend({
    niceName: 'Keycard',
    sound: 'keycard',
    spritewidth: 14,

    init: function( x, y, settings ){
        this.cardtype = settings.type;
        this.spriteimage = 'keycard-' + this.cardtype;
        this.parent( x, y, settings );
    },

    onCollision: function(res, obj) {
        this.parent(res, obj);
        if ( obj.inventory ) {
            obj.inventory.pogo = true;
            obj.inventory.keycards[ this.cardtype ] = true;
        }
    }
});

/* --------------------------
An enemy Entity
------------------------ */
var EnemyEntity = me.ObjectEntity.extend({

    deadly: true,
    init: function(x, y, settings) {
        settings.image = this.spriteimage;
        settings.spritewidth = this.spritewidth;
        settings.spriteheight = this.spriteheight;

        // call the parent constructor
        this.parent(x, y, settings);

        // make it collidable
        this.collidable = true;

        // make it a enemy object
        this.type = me.game.ENEMY_OBJECT;

    },
    update: function() {
        this.parent();
        this.updateMovement();
    }
});


var PatPatEntity = EnemyEntity.extend({
    spriteimage: 'pat-pat',
    spritewidth: 14,
});

var VorticonEntity = EnemyEntity.extend({
    spriteimage: 'green-spikes',
    spritewidth: 14,
    spriteheight: 14
});

var GargEntity = EnemyEntity.extend({
    spriteimage: 'green-spikes',
    spritewidth: 14,
    spriteheight: 14
});

var GreenSpikesEntity = EnemyEntity.extend({
    spriteimage: 'green-spikes',
    spritewidth: 32,
    spriteheight: 16,
    init: function( x, y, settings ){
        this.parent( x, y, settings );
        this.addAnimation('wave', [0,1,2,3]);
        this.setCurrentAnimation('wave');
        this.gravity = 0;
    }
});



var YorpEntity = EnemyEntity.extend({
    deadly: false,
    spritewidth: 16,
    spriteheight: 24,
    spriteimage: 'yorp',

    init: function( x, y, settings ) {
        // call the parent constructor
        this.parent(x, y, settings);

        this.addAnimation ('look', [1,2,3,2]);
        this.addAnimation ('walk_right', [6,7]);
        this.addAnimation ('walk_left', [4,5]);
        
        this.addAnimation ('cry', [8,9]);

        this.addAnimation ('die', [10]);
        this.addAnimation ('dead', [11]);

        this.setCurrentAnimation('look');

        this.startX = x;
        this.endX   = x+settings.width - settings.spritewidth; // size of sprite
        
        
        // make him start from the right
        this.pos.x = x + settings.width - settings.spritewidth;
        this.walkLeft = true;

        // walking & jumping speed
        this.setVelocity(0.2, 6);
        
        // make it collidable
        this.collidable = true;
    },

    update: function() {
        this.parent();

        if ( this.alive ) {

            if ( !this.framesSinceHop ) {
                this.framesSinceHop = 0;
            }
            if ( this.framesSinceHop > 40 ) {
                this.gravity = 0.05;
                this.vel.y = -1;
                this.framesSinceHop = 0;
            }
            this.framesSinceHop++;
            


            var mainPlayer = me.game.getEntityByName("mainPlayer")[0];

            if ( this.pos.x > mainPlayer.pos.x ) {
                this.walkLeft = true;
                this.setCurrentAnimation('walk_left');
            } else {
                this.walkLeft = false;
                this.setCurrentAnimation('walk_right');
            }

            var distanceToPlayer = this.distanceTo( me.game.getEntityByName("mainPlayer")[0]);
            if ( distanceToPlayer > 20 ) {
                this.vel.x += (this.walkLeft) ? -this.accel.x * me.timer.tick : this.accel.x * me.timer.tick;
            } else {
                this.vel.x = 0;
            }

        // END if ( this.alive )
        } else {
            this.vel.x = 0;
            this.framesSinceDeath++;
            if ( this.framesSinceDeath > 10 ) {
                this.setCurrentAnimation('dead');
                this.collidable = false;
            }
        }

        if (this.headBumpFrameCount && this.alive) {

            if (this.headBumpFrameCount > 300) {
                // this.collidable = true;
                this.setCurrentAnimation('look');
                delete this.headBumpFrameCount;
            } else {
                this.setCurrentAnimation('cry');
                this.vel.x = 0;
                this.vel.y = 0;
                this.headBumpFrameCount++;
            }

        }

        // check & update movement
        this.updateMovement();
            
        if (this.vel.x!=0 ||this.vel.y!=0) {
            // update the object animation
            this.parent();
            return true;
        }


    },

    onShot: function( bullet ) {
        bullet.vel.x = 0;
        if ( this.alive ) {
            this.alive = false;
            this.setCurrentAnimation('die');
            
            me.audio.play('yorp-die');
            this.framesSinceDeath = 0;
        }

    },

    onCollision: function(res, obj) {
        if ( res.y > 0 && !this.headBumpFrameCount) {
            this.onHeadBump(res, obj);
        }
    },

    onHeadBump: function(res, obj) {
        if ( obj.alive ) {
            me.audio.play('yorp-cry');
            this.headBumpFrameCount = 1;
            obj.pogoing = false;
        }
    }


});

/*--------------
A score HUD item
--------------------- */
 
var ScoreObject = me.HUD_Item.extend({
    init: function(x, y) {
        // call the parent constructor
        this.parent(x, y);
        // create a font
        this.font = new me.BitmapFont("32x32_font", 32);
    },
 
    // draw our score
    draw: function(context, x, y) {
        this.font.draw(context, 'LOL', this.pos.x + x, this.pos.y + y);

    }
 
});

var BulletEntity = me.ObjectEntity.extend({

   init: function(x, y, settings) {
        settings.image = 'bullet';
        settings.spritewidth = 16;

        this.speed = 2;

        this.direction = settings.direction;

        // call the parent constructor
        this.parent(x, y, settings);

        // make it collidable
        this.collidable = true;

        this.addAnimation ('flying', [0]);
        this.setCurrentAnimation('flying');

        this.addAnimation ('zap', [1]);
        this.addAnimation ('zot', [2]);

        this.gravity = 0;

    },

    update: function() {

        this.vel.x = this.direction == 'left'? -this.speed : this.speed;


        var res = me.game.collide(this);
        if ( res ) {
            // (res.obj instanceof EnemyEntity)
            if ( res.obj.onShot ) {
                res.obj.onShot( this );
            }
        }

        
        this.updateMovement();

        if ( this.vel.x == 0 ) {

            if (!this.framesOnWall) {
                this.framesOnWall = 0;

                var randomBool = !! Math.round(Math.random() * 1);
                if (randomBool) {
                    this.animation = 'zap';
                } else {
                    this.animation = 'zot';
                }

                this.setCurrentAnimation( this.animation );
                me.audio.play('shoot-wall');
            }

            if (this.framesOnWall > 9 ) {
                me.game.remove(this);
            }
            this.framesOnWall += 1;
        }

        this.updateMovement();
        return true;
        
    }
});

/*----------------------
    A title screen
  ----------------------*/
var TitleScreen = me.ScreenObject.extend({
    // constructor
    init: function() {
        this.parent(true);
 
        // title screen image
        this.title = null;
 
        this.font = null;
        this.scrollerfont = null;
        this.scrollertween = null;
 
        this.scroller = "A SMALL STEP BY STEP TUTORIAL FOR GAME CREATION WITH MELONJS       ";
        this.scrollerpos = 600;
    },
 
    // reset function
    onResetEvent: function() {
        if (this.title == null) {
            // init stuff if not yet done
            this.title = me.loader.getImage("title_screen");
            // font to display the menu items
            this.font = new me.BitmapFont("32x32_font", 32);
            this.font.set("left");
 
            // set the scroller
            this.scrollerfont = new me.BitmapFont("32x32_font", 32);
            this.scrollerfont.set("left");
 
        }
 
        // reset to default value
        this.scrollerpos = 640;
 
        // a tween to animate the arrow
        this.scrollertween = new me.Tween(this).to({
            scrollerpos: -2200
        }, 10000).onComplete(this.scrollover.bind(this)).start();
 
        // enable the keyboard
        me.input.bindKey(me.input.KEY.ENTER, "enter", true);
 
        // play something
        // me.audio.play("cling");
 
    },
 
    // some callback for the tween objects
    scrollover: function() {
        // reset to default value
        this.scrollerpos = 640;
        this.scrollertween.to({
            scrollerpos: -2200
        }, 10000).onComplete(this.scrollover.bind(this)).start();
    },
 
    // update function
    update: function() {
        // enter pressed ?
        if (me.input.isKeyPressed('enter')) {
            me.state.change(me.state.PLAY);
        }
        return true;
    },
 
    // draw function
    draw: function(context) {
        context.drawImage(this.title, 0, 0);
 
        this.font.draw(context, "PRESS ENTER TO PLAY", 20, 240);
        this.scrollerfont.draw(context, this.scroller, this.scrollerpos, 440);
    },
 
    // destroy function
    onDestroyEvent: function() {
        me.input.unbindKey(me.input.KEY.ENTER);
 
        //just in case
        this.scrollertween.stop();
    }
 
});
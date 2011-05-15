window.onload = function () {
    //start crafty
    Crafty.init(400, 336);
    //Crafty.canvas();

    //turn the sprite map into usable components
    Crafty.sprite(16, "sprite.png", {
        grass1: [0, 0],
        grass2: [1, 0],
        grass3: [2, 0],
        grass4: [3, 0],
        flower: [0, 1],
        bush1: [0, 2],
        bush2: [1, 2],
        player: [0, 3],
        enemy: [0, 3],
        banana: [4, 0],
        empty: [4, 0]
    });

    //method to generate the map
    function generateWorld() {
        //loop through all tiles
        for (var i = 0; i < 25; i++) {
            for (var j = 0; j < 21; j++) {

                //place grass on all tiles
                grassType = Crafty.randRange(1, 4);
                Crafty.e("2D, DOM, grass" + grassType)
                    .attr({ x: i * 16, y: j * 16, z:1 });

                //grid of bushes
                if((i % 2 === 0) && (j % 2 === 0)) {
                    Crafty.e("2D, Grid, DOM, solid, bush1")
                        .attr({z: 2000})
                        .col(i)
                        .row(j);
                }

                //create a fence of bushes
                if(i === 0 || i === 24 || j === 0 || j === 20)
                    Crafty.e("2D, DOM, solid, bush" + Crafty.randRange(1, 2))
                    .attr({ x: i * 16, y: j * 16, z: 2 });

                //generate some nice flowers within the boundaries of the outer bushes
                if (i > 0 && i < 24 && j > 0 && j < 20
                        && Crafty.randRange(0, 50) > 30
                        && !(i === 1 && j >= 16)
                        && !(i === 23 && j <= 4)) {
                    var f = Crafty.e("2D, DOM, flower, Collision, solid, SpriteAnimation, explodable")
                            .attr({ x: i * 16, y: j * 16, z: 1000 })
                            .animate("wind", 0, 1, 3)
                            .animate('wind', 80, -1)
                            .bind('explode', function() {
                                this.destroy();
                            })
                            .collision();
                    if(f.hit('solid')) {
                        f.destroy();
                    }
                }
            }
        }
    }

    //the loading screen that will display while our assets load
    Crafty.scene("loading", function () {
        //load takes an array of assets and a callback when complete
        Crafty.load(["sprite.png"], function () {
            Crafty.scene("main"); //when everything is loaded, run the main scene
        });

        //black background with some loading text
        Crafty.background("#000");
        Crafty.e("2D, DOM, Text").attr({ w: 100, h: 20, x: 150, y: 120 })
                .text("Loading")
                .css({ "text-align": "center" });
    });

    //automatically play the loading scene
    Crafty.scene("loading");

    /**@
    * #Dropper
    * Triggers Drooped event when SPACE is pressed.
    */
    Crafty.c('Dropper', {
        _drop: false,
        _key: Crafty.keys.SPACE,

        init: function() {
            this.bind('KeyDown', function (e) {
                if (e.keyCode === this._key && !this._drop) {
                    this._drop = true;
                    //send event to host entity
                    this.trigger('Dropped', {dropType: 'BananaBomb'});

                    //in most browsers the keydown event fires very rapidly when a key is pressed down.
                    //having a cooldown of 300ms is more reasonable
                    this.delay(function() {
                        this._drop = false;
                    }, 300);
                }
            });
        }
    });

    Crafty.c('BombDropper', {
        _dropped: 0,
        maxBombs: 2,

        init: function() {
            var dropper = this;
            //this component is dependant on functionality in Dropper, so that component is added
            this.requires('Dropper, Grid')

            //Create the bomb
            .bind('Dropped', function() {
                    if(dropper._dropped < dropper.maxBombs) {
                        Crafty.e('BananaBomb')
                            .attr({z:100})
                            .col(this.col())
                            .row(this.row())
                            .BananaBomb()
                            .bind('explode', function() {
                                dropper._dropped--;

                            });

                        dropper._dropped++;
                    }
                });
        }
    });

    Crafty.c('BananaBomb', {

        init: function() {
            this.requires("2D, DOM, SpriteAnimation, Grid, banana, explodable")
                .animate('explode', 4, 0, 5)
                .animate('explode', 50, -1)
                .delay(function() {
                    this.trigger("explode");
                }, 4000)
                .bind('explode', function() {
                    this.destroy();

                    //Create fire from the explosion
                    for(var i = this.col() - 2; i < this.col()+3; i++)
                        Crafty.e("BananaFire").attr({ z:9000 }).col(i).row(this.row())
                    for(var i = this.row() - 2; i < this.row()+3; i++)
                        Crafty.e("BananaFire").attr({ z:9000 }).col(this.col()).row(i)
                });
        },

        BananaBomb: function() {
            //Create shadow fire to help the AI
            for(var i = this.col() - 2; i < this.col()+3; i++)
                Crafty.e("ShadowBananaFire").attr({ z:9000 }).col(i).row(this.row())
            for(var i = this.row() - 2; i < this.row()+3; i++)
                Crafty.e("ShadowBananaFire").attr({ z:9000 }).col(this.col()).row(i)
            return this;
        }
    });

    Crafty.c('BananaFire', {

        init: function() {
            this.requires("2D, DOM, SpriteAnimation, banana, Grid, Collision, fire")
                .animate('fire', 4, 0, 5)
                .animate('fire', 10, -1)
                .collision()
                .onHit('explodable', function(o) {
                    for(var i = 0; i < o.length; i++) {
                        o[i].obj.trigger("explode");
                    }
                })
                .delay(function() {
                    this.destroy();
                }, 2000);
        }
    });

    // Helps the AI avoid unsafe tiles. Created when a bomb is dropped and removed after fire is gone
    Crafty.c('ShadowBananaFire', {

        init: function() {
            this.requires("2D, Grid, empty, Collision, ShadowFire")
                .collision()
                .delay(function() {
                    this.destroy();
                }, 6100);
        }
    });

    Crafty.c('Grid', {
        _cellSize: 16,
        Grid: function(cellSize) {
            if(cellSize) this._cellSize = cellSize;
            return this;
        },
        col: function(col) {
            if(arguments.length === 1) {
                this.x = this._cellSize * col;
                return this;
            } else {
                return Math.round(this.x / this._cellSize);
            }
        },
        row: function(row) {
            if(arguments.length === 1) {
                this.y = this._cellSize * row;
                return this;
            } else {
                return Math.round(this.y / this._cellSize);
            }
        },      
        snap: function(){
            this.x = Math.round(this.x/this._cellSize) * this._cellSize;
            this.y = Math.round(this.y/this._cellSize) * this._cellSize;
        }
    });
    
    Crafty.c('CustomControls', {
        __move: { left: false, right: false, up: false, down: false },
        _speed: 3,

        //TODO: implement direction through cirkular buffer to allow continuous movement after 2. arrow is released and nicer snap.
        CustomControls: function (speed) {
            if (speed) this._speed = speed;
            var move = this.__move;

            this.bind('enterframe',
                    function () {
                        //move the player in a direction depending on the booleans
                        //only move the player in one direction at a time (up/down/left/right)
                        if (move.right) { this.x += this._speed; }
                        else if (move.left) { this.x -= this._speed;}
                        else if (move.up) { this.y -= this._speed; }
                        else if (move.down) { this.y += this._speed; }
                        
                    }).bind('KeyDown',
                    function (e) {
                        //when an arrow key is pressed clear all previous movement settings
                        if(e.keyCode === Crafty.keys.RIGHT_ARROW ||e.keyCode === Crafty.keys.LEFT_ARROW || e.keyCode === Crafty.keys.UP_ARROW || e.keyCode === Crafty.keys.DOWN_ARROW){
                            move.right = move.left = move.down = move.up = false;
                        }

                        //set direction depending on the arrow key
                        if (e.keyCode === Crafty.keys.RIGHT_ARROW)  move.right = true;
                        if (e.keyCode === Crafty.keys.LEFT_ARROW)   move.left = true;
                        if (e.keyCode === Crafty.keys.UP_ARROW)     move.up = true;
                        if (e.keyCode === Crafty.keys.DOWN_ARROW)   move.down = true;

                    }).bind('KeyUp', function (e) {
                        //when a key is teleased stop moving in that direction
                        if (e.keyCode === Crafty.keys.RIGHT_ARROW)  move.right = false;
                        if (e.keyCode === Crafty.keys.LEFT_ARROW)   move.left = false;
                        if (e.keyCode === Crafty.keys.UP_ARROW)     move.up = false;
                        if (e.keyCode === Crafty.keys.DOWN_ARROW)   move.down = false;
                        //move the player to a grid position when it stops
                        this.snap();
                    });
            return this;
        }
    });

    Crafty.c('AIControls', {
        _move: 'down',
        _directions: {0: 'left', 1:'right', 2: 'up', 3: 'down'},
        _speed: 3,
        _inShadow: false,

        AIControls: function (speed) {
            if (speed) this._speed = speed;

            //functions to determine if there is a free path in some direction
            var AIScope = this;
            var pathTester = Crafty.e('2D, empty, Collision').attr({z:30000}).collision();
            var PathTest = {
                left: function() { pathTester.attr({x: AIScope.x-AIScope._speed, y: AIScope.y});
                    return !(pathTester.hit('solid') || (!AIScope._inShadow && pathTester.hit('ShadowBananaFire')));},
                right: function() { pathTester.attr({x: AIScope.x+AIScope._speed, y: AIScope.y});
                    return !(pathTester.hit('solid') || (!AIScope._inShadow && pathTester.hit('ShadowBananaFire')));},
                up: function() { pathTester.attr({x: AIScope.x, y: AIScope.y-AIScope._speed});
                    return !(pathTester.hit('solid') || (!AIScope._inShadow && pathTester.hit('ShadowBananaFire')));},
                down: function() { pathTester.attr({x: AIScope.x, y: AIScope.y+AIScope._speed});
                    return !(pathTester.hit('solid') || (!AIScope._inShadow && pathTester.hit('ShadowBananaFire')));},
                none: function() { return false; }
            };

            function bombWillHit() {
                pathTester.attr({x: AIScope.x-1, y: AIScope.y});
                if(pathTester.hit('flower')) { return true; }
                pathTester.attr({x: AIScope.x+1, y: AIScope.y});
                if(pathTester.hit('flower')) { return true; }
                pathTester.attr({x: AIScope.x, y: AIScope.y-1});
                if(pathTester.hit('flower')) { return true; }
                pathTester.attr({x: AIScope.x, y: AIScope.y+1});
                if(pathTester.hit('flower')) { return true; }
                return false;
            }

            this.bind('enterframe', function() {
                var nextDirection = '';
                if(PathTest[this._move]())
                {
                    nextDirection = this._move;

                    //when we are at a crossroad interesting things can happen
                    if(this.x % 16 < this._speed && this.y % 16 < this._speed) {
                        //change direction
                        if(Crafty.randRange(0, 2) === 0) {
                            if(nextDirection === 'down' || nextDirection === 'up') {
                                if(PathTest.left()) { nextDirection = 'left' }
                                else if(PathTest.right()) { nextDirection = 'right' }
                            }else{
                                if(PathTest.up()) { nextDirection = 'up' }
                                else if(PathTest.down()) { nextDirection = 'down' }
                            }
                        }
                        if(bombWillHit() &&
                                !this._inShadow) {
                            this.trigger('Dropped');
                        }
                    }
                }else{
                    this.snap();
                    nextDirection = this._directions[Crafty.randRange(0,3)];
                    if(nextDirection === this._move) {
                        nextDirection = "none"; //we need to think
                    }

                }
                this._move = nextDirection;

                if(PathTest[this._move]()) {
                    if (this._move == "right") this.x += this._speed;
                    else if (this._move == "left") this.x -= this._speed;
                    else if (this._move == "up") this.y -= this._speed;
                    else if (this._move == "down") this.y += this._speed;
                }
            })
            .onHit("ShadowBananaFire", function () {
                this._inShadow = true;
            }, function() {
                this._inShadow = false;
            });

            /*var mov = this.__move;

            this.bind('enterframe',
                function () {
                    //only move the enemy in one direction at a time (up/down/left/right)
                    if (mov.right) this.x += this._speed;
                    else if (mov.left) this.x -= this._speed;
                    else if (mov.up) this.y -= this._speed;
                    else if (mov.down) this.y += this._speed;

                    //Decide next move
                    if(!mov.right && !mov.left && !mov.down && !mov.up) {
                        var direction = Crafty.randRange(1,4);
                        if(direction === 1)
                            mov.left = true;
                        if(direction === 2)
                            mov.up = true;
                        if(direction === 3)
                            mov.right = true;
                        if(direction === 4)
                            mov.down = true;
                    }
                })
                //don't move into dangerous tiles
                .onHit("ShadowFire", function () {
                    if(this._inShadow)
                        return;

                    this._inShadow = true;
                    this.snap();
                    this.stop();
                    mov.left = mov.up = mov.right = mov.down = false;
                }, function() {
                    this._inShadow = false;
                }).onHit("flower", function() {
                    this.trigger("Dropped");
                }).onHit("solid", function () {
                    // Move unit out of the solid area and stop movement
                    this.snap();
                    this.stop();
                    mov.left = mov.up = mov.right = mov.down = false;
                });
                */

            return this;
        }
    });
    
    Crafty.c('Ape', {
        Ape: function() {
                //setup animations
                this.animate("walk_left", 6, 3, 8)
                .animate("walk_right", 9, 3, 11)
                .animate("walk_up", 3, 3, 5)
                .animate("walk_down", 0, 3, 2)
                //change direction when a direction change event is received
                .bind("NewDirection",
                    function (direction) {
                        if (direction.x < 0) {
                            if (!this.isPlaying("walk_left"))
                                this.stop().animate("walk_left", 10, -1);
                        }
                        if (direction.x > 0) {
                            if (!this.isPlaying("walk_right"))
                                this.stop().animate("walk_right", 10, -1);
                        }
                        if (direction.y < 0) {
                            if (!this.isPlaying("walk_up"))
                                this.stop().animate("walk_up", 10, -1);
                        }
                        if (direction.y > 0) {
                            if (!this.isPlaying("walk_down"))
                                this.stop().animate("walk_down", 10, -1);
                        }
                        if(!direction.x && !direction.y) {
                            this.stop();
                        }
                })
                // A rudimentary way to prevent the user from passing solid areas
                .onHit("solid", function () {
                    this.snap();
                }).onHit("fire", function() {
                    this.destroy();
                });
            return this;
        }
    });
    
    Crafty.c("RightControls", {
            init: function() {
                this.requires('Multiway');
            },
            
            rightControls: function(speed) {
                this.multiway(speed, {UP_ARROW: -90, DOWN_ARROW: 90, RIGHT_ARROW: 0, LEFT_ARROW: 180})
                return this;
            }
            
        });
        
        Crafty.c("LeftControls", {
            init: function() {
                this.requires('Multiway');
            },
            
            leftControls: function(speed) {
                this.multiway(speed, {W: -90, S: 90, D: 0, A: 180})
                return this;
            }
            
        });

    Crafty.scene("main", function () {
        generateWorld();
        
        //create our player entity with some premade components
        var player1 = Crafty.e("2D, DOM, Ape, player, LeftControls, SpriteAnimation, Collision, BombDropper, Grid")
                .attr({ x: 16, y: 304, z: 1 })
                .leftControls(1)
                .Ape();
        
        //create our player entity with some premade components
        var player2 = Crafty.e("2D, DOM, Ape, player, RightControls, SpriteAnimation, Collision, BombDropper, Grid")
                .attr({ x: 368, y: 16, z: 1 })
                .rightControls(1)
                .Ape();
        /*
        //create our enemy entity with some premade components
        var enemy = Crafty.e("2D, DOM, Ape, enemy, AIControls, SpriteAnimation, Collision, BombDropper, Grid")
                .attr({ x: 368, y: 16, z: 2 })
                .AIControls(1)
                .Ape();
        
*/
    });
};
window.onload = function () {
    //start crafty
    Crafty.init(50, 400, 336);
    Crafty.canvas();

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
        banana: [4, 0]
    });

    //method to randomy generate the map
    function generateWorld() {
        //generate the grass along the x-axis
        for (var i = 0; i < 25; i++) {
            //generate the grass along the y-axis
            for (var j = 0; j < 21; j++) {
                grassType = Crafty.randRange(1, 4);
                Crafty.e("2D, canvas, grass" + grassType)
                        .attr({ x: i * 16, y: j * 16, z:1 });

                //1/50 chance of drawing a flower and only within the bushes
                if (i > 0 && i < 24 && j > 0 && j < 19 && Crafty.randRange(0, 50) > 5) {
                    var f = Crafty.e("2D, DOM, flower, animate, explodable")
                            .attr({ x: i * 16, y: j * 16, z: 1000 })
                            .animate("wind", 0, 1, 3)
                            //.bind("enterframe", function () {
                            //   if (!this.isPlaying())
                            //        this.animate("wind", 80);
                            //})
                            .bind('explode', function() {
                                this.destroy();
                            });

//                    if (!f.isPlaying())
  //                      f.animate("wind", 80);


                    ani.call(f);
                    function ani() {
                        this.animate('wind', 80, -1);
                        //this.delay(ani, 80);
                    };
                }

                //Gitter
                if((i % 2 === 0) && (j % 2 === 0)) {
                    Crafty.e("2D, Grid, canvas, wall, bush1")
                        .attr({ col: i, row: j, z: 2000});
                }
            }
        }

        //create the bushes along the x-axis which will form the boundaries
        for (var i = 0; i < 25; i++) {
            Crafty.e("2D, canvas, wall, bush" + Crafty.randRange(1, 2))
                    .attr({ x: i * 16, y: 0, z: 2 });
            Crafty.e("2D, DOM, wall, bush" + Crafty.randRange(1, 2))
                    .attr({ x: i * 16, y: 320, z: 2 });
        }

        //create the bushes along the y-axis
        //we need to start one more and one less to not overlap the previous bushes
        for (var i = 1; i < 20; i++) {
            Crafty.e("2D, DOM, wall_left, wall, bush" + Crafty.randRange(1, 2))
                    .attr({ x: 0, y: i * 16, z: 2 });
            Crafty.e("2D, canvas, wall_right, wall, bush" + Crafty.randRange(1, 2))
                    .attr({ x: 384, y: i * 16, z: 2 });
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

    /*Please note that this component is a bit over engineered for our purpose. This is because i am an engineer at
    heart and really enjoy building reusable components. Best practice is to build components just sophisticated enough
    to meet current requirements and then extend them when new use cases emerge.*/
    Crafty.c('Dropper', {
        _drop: false,
        _dropType: 'default',
        _key: Crafty.keys.SPACE,


        Dropper: function(dropKey, dropType) {
            if (dropKey) this._key = dropKey;
            if(dropType) this._dropType = dropType;

            return this;
        },
        init: function() {
            this.bind('enterframe',
                function (e) {
                    if (this._drop) {
                        this._drop = false;
                        this.trigger('Dropped', {dropType: this._dropType});
                    }
                })
                .bind('keydown', function (e) {
                    if (e.keyCode === this._key) this._drop = true;
                });
        }
    });

    Crafty.c('BombDropper', {
        init: function() {
            this.requires('Dropper')

                //Create the bomb
                .bind('Dropped', function() {
                    Crafty.e('BananaBomb')
                        .attr({ col: player.col, row:player.row, z:100})
            });
        }
    });

    Crafty.c('BananaBomb', {
        init: function() {

            this.requires("2D, canvas, animate, Grid, banana, explodable")
                .animate('explode', 4, 0, 5)
                //.bind('enterframe', function () {
                //    if (!this.isPlaying())
                //        this.animate('explode', 50);
                //})
                .animate('explode', 50, -1)
                .delay(function() {
                    this.trigger("explode");
                }, 4000)
                .bind('explode', function() {
                    this.destroy();

                    //Create fire from the explosion
                    for(var i = this.col - 2; i < this.col+3; i++)
                        Crafty.e("BananaFire").attr({ col: i, row: this.row, z:9000 })
                    for(var i = this.row - 2; i < this.row+3; i++)
                        Crafty.e("BananaFire").attr({ col: this.col, row: i, z:9000 })
                });
        }
    });

    Crafty.c('BananaFire', {
        init: function() {
            this.requires("2D, canvas, animate, banana, Grid, collision")
                .animate('fire', 4, 0, 5)
                .animate('fire', 10, -1)
                //.bind('enterframe', function () {
                //    if (!this.isPlaying())
                //        this.animate('fire', 10);
                //})
                .collision()
                .onhit('explodable', function(o) {
                    for(var i = 0; i < o.length; i++) {
                        o[i].obj.trigger("explode");
                    }
                })
                .delay(function() {
                    this.destroy();
                //                  alert("gone " + this.col + " " + this.row);
                }, 2000);
        }
    });

    Crafty.c('Grid', {
        _cellSize: 16,
        Grid: function(cellSize) {
            if(cellSize) this._cellSize = cellSize;
            return this;
        },
        init: function() {
            this.setter('col', function(v) { this.x = this._cellSize * v; }).getter('col', function() { return Math.round(this.x / this._cellSize); })
                .setter('row', function(v) { this.y = this._cellSize * v; }).getter('row', function() { return Math.round(this.y / this._cellSize); });
        },
        snap: function(){
            this.col = this.col;
            this.row = this.row;
        }
    });

    Crafty.scene("main", function () {
        generateWorld();

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
                            if (move.right) this.x += this._speed;
                            else if (move.left) this.x -= this._speed;
                            else if (move.up) this.y -= this._speed;
                            else if (move.down) this.y += this._speed;

                        }).bind('keydown',
                        function (e) {
                            //default movement booleans to false
                            if(e.keyCode === Crafty.keys.RIGHT_ARROW ||e.keyCode === Crafty.keys.LEFT_ARROW || e.keyCode === Crafty.keys.UP_ARROW || e.keyCode === Crafty.keys.DOWN_ARROW){
                                move.right = move.left = move.down = move.up = false;
                            }

                            //if keys are down, set the direction
                            if (e.keyCode === Crafty.keys.RIGHT_ARROW)  move.right = true;
                            if (e.keyCode === Crafty.keys.LEFT_ARROW)   move.left = true;
                            if (e.keyCode === Crafty.keys.UP_ARROW)     move.up = true;
                            if (e.keyCode === Crafty.keys.DOWN_ARROW)   move.down = true;

                            //this.preventTypeaheadFind(e);
                        }).bind('keyup', function (e) {
                    //if key is released, stop moving
                    if (e.keyCode === Crafty.keys.RIGHT_ARROW)  move.right = false;
                    if (e.keyCode === Crafty.keys.LEFT_ARROW)   move.left = false;
                    if (e.keyCode === Crafty.keys.UP_ARROW)     move.up = false;
                    if (e.keyCode === Crafty.keys.DOWN_ARROW)   move.down = false;
                    this.snap();
                    //this.preventTypeaheadFind(e);
                });

                return this;
            }
        });

        //create our player entity with some premade components
        player = Crafty.e("2D, canvas, player, controls, CustomControls, animate, collision, BombDropper, Grid")
                .attr({ x: 160, y: 144, z: 1 })
                .CustomControls(1)
                .animate("walk_left", 6, 3, 8)
                .animate("walk_right", 9, 3, 11)
                .animate("walk_up", 3, 3, 5)
                .animate("walk_down", 0, 3, 2)
                .bind("enterframe",
                    function (e) {

                        if (this.__move.left) {
                            if (!this.isPlaying("walk_left"))
                            {
                                this.stop().animate("walk_left", 10);
                            }
                        }
                        if (this.__move.right) {
                            if (!this.isPlaying("walk_right"))
                                this.stop().animate("walk_right", 10);
                        }
                        if (this.__move.up) {
                            if (!this.isPlaying("walk_up"))
                                this.stop().animate("walk_up", 10);
                        }
                        if (this.__move.down) {
                            if (!this.isPlaying("walk_down"))
                                this.stop().animate("walk_down", 10);
                        }
                })
                .bind("keyup", function (e) {
                    this.stop();
                })
                .collision()
                .onhit("wall", function () {
                    if (this.__move.left)
                        this.x += this._speed;
                    if (this.__move.right)
                        this.x -= this._speed;
                    if (this.__move.up)
                        this.y += this._speed;
                    if (this.__move.down)
                        this.y -= this._speed;
                    this.stop();
                });
    });
};
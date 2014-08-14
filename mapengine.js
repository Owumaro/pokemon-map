function MapEngine() {
    // Attrs
    this.imgs = new Object();
    this.playerList = new PlayerList();
    this.moving = false;
    this.zoom = null;

    // Methods
    
    // Load map
    this.loadMap = function() {
        // Get map properties from JSON file
        var self = this;
        $.ajax({
            url: 'json/map.json',
            dataType: 'json',
            async: false,
            success: function(data) {
                self.map = data;
            }
        });

        // Load map image
        this.imgs[this.map.file] = new Image();
        this.imgs[this.map.file].src = this.map.file;

        // Get map image dimensions
        $(this.imgs[this.map.file]).load(function() {
            self.width = self.imgs[self.map.file].width/16;
            self.height = self.imgs[self.map.file].height/16;
        });
    }

    // Load characters images
    this.loadCharactersImages = function() {
        var players = this.playerList.players;
        for (i in players) {
            var src = 'img/characters/' + players[i].character + '.gif';
            if ($.inArray(src, this.imgs) == -1) {
                var img = new Image();
                img.src = src;
                this.imgs[src] = img;
            }
        }
    }

    // Check if all images have loaded
    this.checkImagesLoad = function(callback) {
        var size = Object.keys(this.imgs).length;
        var loaded = 0;
        for (i in this.imgs) {
            if (this.imgs[i].complete) {
                loaded++;
                if (loaded == size) {
                    callback();
                }
            }
            else {
                $(this.imgs[i]).load(function() {
                    loaded++;
                    if (loaded == size) {
                        callback();
                    }
                });
            }
        }
    }
}
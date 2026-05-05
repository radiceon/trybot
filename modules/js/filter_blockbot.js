(function(a) {
    "use strict";
    var b = a.bot,
        c = "unlock",
        d = {
            "lock": "iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACu8AAArvAX12ikgAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAgtJREFUOE9tks9P02AYx/kDvBkVkICwCYyBG4PhiQ2OS0wIG5IQhkR+LMwpGmAKYiByEFz1YBCjHHAa+QdA3YV2B6mTsc4gmGX9NdiF7YRXjcnXd9XVbXD4tE+fPp9++7ZvEYA8OC56RZYTga2tcDIc3j4g9RrLsu2Fc3kXsVjMGwp9QU9PL1pbrQr9/dcRiXCIRr8O5s6qxfv1dQNJg9l8GVNT98Gyn3992tz8PTp6GxZLG3Z2vv184/dfOCYmD5K+mZlZOJ19ODr6EQ58+Kih6Q1dOp3+3tHRCYp6CkmS7x4T+Ti/mpGWll4gynHXsv3d3b078/MLcLs9EEXxWbavHDw3PKcPD1N7DkcXfD4KqVQqFuf5YDzOB0miMD39AAMDg6SfDtlstlOqKAiib3HxORqNJrRZ22G3O3C1q1vB3umA1WJV7q2svAb5gGOqKCf23w0PuWBoMKDF3IJmUxOaTM3k/JdMT19XD++EF4nE/mNVJIv2u0fc0Ov06nAhuppaTN6bhCzLj1RRJKJr2IWai9UwXjKi8R+ZOou2SqskkpAcUZT8Q2TxmsoqNNTpVepz6sryCoyPjeeLgii97et1ouJ8GWpJ6kmUFZfglucmyNst/E+U5JcT5Gml54pRrdGeSMmZs5h7OAfyB2ZVcfnVsoZsN4beYESGCQqF0BloRtyOcAGKelIKoOgPjhfgcP7O7+UAAAAASUVORK5CYII=",
            "unlock": "iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAACu8AAArvAX12ikgAAAAadEVYdFNvZnR3YXJlAFBhaW50Lk5FVCB2My41LjEwMPRyoQAAAgpJREFUOE9tkstPE0Ecx/fsyYtYxFQetda2lrJFPOHqVQxGAiZWI40JSrHlAKSlhJgYWrkYPFgN4oNUj8SDwcZHuiW2S0JfHGja7stt6kHa/8AYk69DhcWVHj4zv99v5pPfTGYoABqymUyfoigfU6n093Q6UyHx+2QiceH/fZqkWChMbGykcN15A729TB2X6zZyuU3ksrnhf/eqQXR11ZpMcrBabZiengHHrf8i+W+vdxwMcxFb+fzPF4uL+gOiKAjhr4kEXr56je0f25ufotH22JfP5mq1Wuzvv4KFhceQJWnigHh/dtb2bmVlaJ3jBimKatqr57fyk6HQPDweLyRJerRXrw83nc7DpWLpKc/z0VKJ/yAIAkviJM8La7VaTQoEZjAycgeke7KHdhxSRVEU55eeL6Hv0mUMDV7TMHB1AMx5BnQXjUjkDQqFglcVK5XKW/foGMynLeimuzU4aAfOne2Bhaz5fH6Q5wmqYrlcXvbc85JFs1Z07Mcmowk7R5blbw80onvUjVMnjbDbOnex1+namTvtMLQb4CcdZVneFxWlvHyXXL6jtQ1nzJaGtOpPYGpyijyJRlQirlvD0Lcch4l0bUSLrhnj5DNIsjyniuTcz/w+H44d1cHYYWhI85EmBOeCEEQxoIrhJ+E28hdjbIyV42xc+sva7hyX2DqsnMlkow+DIR0A6g8+ed5hlWuiKAAAAABJRU5ErkJggg=="
        },
        e = 0,
        f = $('<img class="control" src="data:image/png;base64,' + d[c] + '">');
    b.controls.settings.after(f);
    $("body").bind("mousemove", function(a) {
        if (b.sett.filter_block_bot !== true) return;
        else {
            e = Timestamp.server() + 3;
            return;
        }
    });
    setInterval(function() {
        var a;
        if ((b.sett.filter_block_bot === true) && (Timestamp.server() < e)) a = "lock";
        else a = "unlock";
        if (c !== a) {
            c = a;
            f.attr("src", "data:image/png;base64," + d[c]);
        }
    }, 1 * 1E3);
    b.filters.add("BLOCK_BOT", function(a, c, d, f, g, h) {
        if (b.sett.filter_block_bot !== true) return true;
        if ((h === "commander") || (h === "na")) return true;
        if (e > Timestamp.server()) return false;
        return true;
    });
})(this);

/**
 * About: gulp编译配置脚本
 * Other:
 * Created: Xiaolong WU on 16/3/27 下午9:52.
 * Editored:
 */

var gulp = require('gulp'); //gulp
var gutil = require('gulp-util'); //gulp工具
var sourcemaps = require('gulp-sourcemaps'); //map插件
var addsrc = require('gulp-add-src'); //追加js文件插件
var coffee = require('gulp-coffee'); //coffeescritp插件
var sass = require('gulp-sass'); //sass插件
var htmlmin = require('gulp-htmlmin'); //html压缩
var imagemin = require('gulp-imagemin'); //图片压缩
var pngcrush = require('imagemin-pngcrush');
var minifycss = require('gulp-minify-css'); //css压缩
var jshint = require('gulp-jshint'); //js检测
var uglify = require('gulp-uglify'); //js压缩
var concat = require('gulp-concat'); //文件合并
var rename = require('gulp-rename'); //文件更名
var cssUrlVersion = require('gulp-make-css-url-version'); //css文件里引用url加版本号（根据引用文件的md5生产版本号）
var notify = require('gulp-notify'); //提示信息
var fs = require('fs-extra'); //fs 工具
var async = require('async'); // 异步工具
var run = require('run-sequence'); //按顺序运行插件
var del = require('del'); //删除工具
var path = require('path');
var urlAdjuster = require('gulp-css-url-adjuster');//修正url路径
var plumber = require('gulp-plumber');//错误处理工具
var browserSync = require('browser-sync').create('myserver1');


gulp.task('coffee : emptyDir', function () {
    return del(['static/js_lib/**']);
});

// 重新编译coffee
gulp.task('coffee : build', function () {
    gulp.src(['static/coffee/**/*.coffee'])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(coffee({
            bare: true
        })).on('error', gutil.log)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('static/js_lib'))
    //.pipe(notify({ message: 'build coffee ok' }));
});

//监听coffee
gulp.task('coffee : watch', function () {
    run('coffee : emptyDir', 'coffee : build');
    gulp.watch('static/coffee/**/*.coffee', function (e) {
        var path = e.path.substring(e.path.indexOf("static/coffee"));
        if (path.lastIndexOf('\\') + 1 == path.length) {
            path = path.substring(0, path.lastIndexOf("\\"));
        }
        var toPath = path.replace('coffee', 'js_lib');
        var index = toPath.lastIndexOf('\\')
        toPath = toPath.substring(0, index);
        gulp.src([path])
            .pipe(sourcemaps.init())
            .pipe(coffee({
                bare: true
            })).on('error', gutil.log)
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest(toPath))
    });
});

//编译coffee 并压缩
gulp.task('coffee : min', function () {
    async.auto({
        delDest: function (cb) { //清空js_lib文件
            fs.emptyDir('static/js_lib', function (err) {
                cb()
            })
        },
        gulpBuild: ['delDest', function (cb) {
            gulp.src(['static/coffee/**/*.coffee'])
                .pipe(coffee({
                    bare: true
                })).on('error', gutil.log)
                .pipe(gulp.dest('static/js'))
                .pipe(concat('dev.js'))
                .pipe(gulp.dest('static/js'))
                .pipe(rename({
                    suffix: '.min'
                }))
                .pipe(uglify())
                .pipe(gulp.dest('static/js'))
                .pipe(notify({
                    message: 'min Coffee ok'
                }));
        }]
    })
});


//清空sass目录
gulp.task('sass : emptyDir', function () {
    return del(['static/css/**']);
});
//编译sass
gulp.task('sass : build', function () {
    return gulp.src('static/sass/**/*.scss')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(sass())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('static/css'));
});
//最小化sass
gulp.task('sass : min', function () {
    var theme = 'static/css/theme.min.css';
    var index = 'static/css/index.min.css';
    var login = 'static/css/login.min.css';
    var skin = 'static/css/skin.min.css';
    gulp.src([theme, index, login, skin])
        .pipe(concat('dev.css'))
        .pipe(gulp.dest('static/css'))
        .pipe(urlAdjuster({
            prepend: './../'
            // append: '?version=1',
        }))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(cssUrlVersion())
        .pipe(minifycss({
            advanced: true, //类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
            compatibility: '*', //保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
            keepBreaks: false //类型：Boolean 默认：false [是否保留换行]
        }))
        .pipe(gulp.dest('static/css'))
    //.pipe(notify({ message: 'build sass ok' }));
});
//监听sass
gulp.task('sass : watch', function () {
    run('sass : emptyDir', 'sass : build', 'sass : min')
    gulp.watch('static/sass/**/*.scss', function (e) {
        run('sass : emptyDir', 'sass : build', 'sass : min')
    });
    //gulp.start('sass : min');
});

//监听sass
gulp.task('js', function () {

    return gulp.src('static/js/**/*.js')
        .pipe(concat('opt.js'))
        .pipe(rename({suffix: '.min'}))   //rename压缩后的文件名
        .pipe(uglify())    //压缩
        .pipe(gulp.dest('static/js/'));  //输出
});

// 合并第三方插件JS
gulp.task('plugin : jsConcat', function() {
    gulp.src(['static/lib/jquery/dist/jquery.min.js',
        'static/lib/underscore/underscore-min.js',
        'static/lib/nprogress/nprogress.js',
        'static/lib/JSON-js/json2.js',
        'static/lib/blueimp-file-upload/js/vendor/jquery.ui.widget.js',
        'static/lib/jquery.floatThead/dist/jquery.floatThead.min.js',
        'static/lib/blueimp-file-upload/js/jquery.iframe-transport.js',
        'static/lib/blueimp-file-upload/js/jquery.fileupload.js',
        'static/lib/Chart.js/dist/Chart.min.js',
        'static/lib/jstree/dist/jstree.min.js',
        'static/lib/malihu-custom-scrollbar-plugin/jquery.mCustomScrollbar.concat.min.js',
        'static/lib/marked/lib/marked.js',
        'static/lib/medium-editor/dist/js/medium-editor.min.js',
        'static/lib/screenfull/dist/screenfull.min.js',
        'static/lib/semantic/dist/semantic.min.js',
        'static/lib/slick-carousel/slick/slick.min.js',
        'static/lib/smalot-bootstrap-datetimepicker/js/bootstrap-datetimepicker.min.js',
        'static/lib/smalot-bootstrap-datetimepicker/js/locales/bootstrap-datetimepicker.zh-CN.js',
        'static/lib/SparkMD5/spark-md5.min.js'
    ])
        .pipe(uglify())
        .pipe(sourcemaps.init())
        .pipe(concat('all.min.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('static/lib/all'))
});

// 合并所有插件及公用JS
gulp.task('common : jsConcat', function () {
    gulp.src(['static/lib/all/all.min.js',
        'static/js_lib/tool/jsonTool.js',
        'static/js_lib/ui/datagrid.js',
        'static/js_lib/ui/scrollbar.js',
        'static/js_lib/ui/alert.js',
        'static/js_lib/ui/droptree.js',
        'static/js_lib/ui/formTool.js',
        'static/js/common.js'
    ])
        .pipe(uglify())
        .pipe(sourcemaps.init())
        .pipe(concat('plugin.min.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('static/lib/all'))
});

// 合并所有插件及公用CSS
gulp.task('common : cssConcat', function () {
    gulp.src(['static/lib/all/all.min.css',
        'static/css/dev.min.css'
    ])
        .pipe(minifycss())
        .pipe(concat('plugin.min.css'))
        .pipe(gulp.dest('static/lib/all'));
});

// 获取static/js下的文件夹
function getFolders(dir) {
    return fs.readdirSync(dir).filter(function (file) {
        return fs.statSync(path.join(dir, file)).isDirectory();
    });
}
// 获取static/js下的文件
function getFiles(dir) {
    return fs.readdirSync(dir).filter(function (file) {
        return fs.statSync(path.join(dir, file)).isFile();
    });
}

// 业务JS压缩合并处理
gulp.task('opt : jsConcat', function () {
    del(['static/js_opt/**']);
    var folders = getFolders('static/js');
    var tasks = folders.map(function (folder) {
        return gulp.src(path.join('static/js', folder, '*.js'))
            .pipe(concat(folder + '.min.js'))
            .pipe(uglify())
            .pipe(gulp.dest('static/js_opt'));
    });

    var files = getFiles('static/js');
    var tasks2 = files.map(function (file) {
        return gulp.src(path.join('static/js', file))
            .pipe(uglify())
            .pipe(rename(file.slice(0, -3) + '.min.js'))
            .pipe(gulp.dest('static/js_opt'));
    });
});

//监听业务JS
gulp.task('opt : watch', function () {
    gulp.watch('static/js/**', function (e) {
        run('opt : jsConcat');
    });
});

// 代理服务器
gulp.task('browser-sync', function() {
    browserSync.init({
        // port:8080,
        proxy: "http://127.0.0.1:8090/dev/index"
    });
    browserSync = require("browser-sync").get('myserver1');
    browserSync.watch("static/lib/all/plugin.min.css").on('change',browserSync.reload);
    browserSync.watch("static/js/*.js").on('change',browserSync.reload);
    browserSync.watch("view/html/*.html").on('change',browserSync.reload);
});

//默认任务
gulp.task('default', ['sass : watch', 'coffee : watch']);
gulp.task('sass', ['sass : watch']);
gulp.task('appjs', ['opt : watch']);
gulp.task('commoncss', ['common : cssConcat']);
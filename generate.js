#!/usr/bin/env node

'use strict';

var walk = require('walk'),
    _ = require('lodash'),
    async = require('async'),
    ellipsize = require('ellipsize'),
    Front = require('yaml-front-matter'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    Path = require('path');

var CONTENT_PATH = __dirname + '/content',
    PUBLIC_DIR = __dirname + '/public';

/**
 * Posts go under their category url
 * Pages go toplevel
 *
 * build an object containing
 * all meta-data so we can loop over them
 *
 * for each category, we can loop over the posts
 * for each post, we have an excerpt
 *
 * when rendering a page, we have a "page" object
 * Page object has a url and metadata. They also have
 * a Path property.
 *
 * Normalize paths to be relative to public.
 * For each category, a template called category is rendered.
 *
 * todo (optional) category directories may get a metadata.yml
 *
 * Categories are rendered over multiple pages. inside the template
 * there is a current page. ( todo improve this )
 *
 * For each page, a page is rendered
 * For each post, a page is rendered
 *
 * todo
 * import must fix urls for attachments.
 *
 */

function pages(path, collect, done) {
    var walker = walk.walk(path);

    walker.on('file', function(root, stats, next) {
        var source = Path.join(root, stats.name),
            relative = source.replace(new RegExp(CONTENT_PATH + '\/(page|post)(\/.+).md'), '$2/'),
            page = {
                source: source,
                path: relative,
                target: Path.join(PUBLIC_DIR, relative, 'index.html')
            };

        collect.push(page);
        next();
    });

    walker.on('end', function() {
        done(null, collect);
    });
}

function category(pages, meta, post) {
    var cat = pages.categories[meta.category] || null;

    if (!cat) {
        cat = {
            title: meta.category,
            type: 'category',
            path: '/' + Path.join('category', meta.category + '/'),
            target: Path.join(PUBLIC_DIR, 'category', meta.category, 'index.html'),
            posts: []
        };
    }

    cat.posts.push(post);

    return cat;
}

function teaser(string) {
    var tsr = string.replace(/[[\]\\(\)]/g, ' ');
    return ellipsize(tsr, 100);
}

function meta(pages, done) {
    var collect = {
        categories: {},
        pages: [],
        posts: []
    };

    async.reduce(pages, collect, function(collect, page, next) {
        var meta = Front.loadFront(page.source),
            content = meta.__content;

        delete(meta.__content);

        _.extend(page, meta, {
            content: content,
            teaser: teaser(content),
            date: new Date(meta.date)
        });

        if (meta.category) {
            collect.categories[meta.category] = category(collect, meta, page);
        }

        collect[meta.type + 's'].push(page);
        next(null, collect);
    }, done);
}


function render(done) {
    pages(CONTENT_PATH, [], function(err, collect) {
        meta(collect, function(err, data) {
            console.log(data.categories.news);
            done();
        });
    });
}

render(function() {
    process.exit();
});

const TurndownService = require('turndown').default;
const marked = require("marked");

const turndownService = new TurndownService();

const htmlToMd = (html) => {
    return turndownService.turndown(html)
}

const mdToHtml = (markdown) => {
    return marked(markdown);
}

module.exports = {
    htmlToMd,
    mdToHtml
}
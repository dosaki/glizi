const TurndownService = require('turndown').default;
const marked = require("marked");

const turndownService = new TurndownService();

const htmlToMd = (html) => {
    return turndownService.turndown(html)
    // return html;
}

const mdToHtml = (markdown) => {
    return marked(markdown);
    // return markdown;
}

module.exports = {
    htmlToMd,
    mdToHtml
}
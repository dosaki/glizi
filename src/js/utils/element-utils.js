const e = {}

e.newElement = (tag, classes, content) => {
    const element = document.createElement(tag);
    element.className = classes;
    if(content){
        element.innerHTML = content;
    }
    return element;
}

e.newDiv = (classes, content) => {
    return e.newElement('div', classes, content);
}

e.classifyText = (text) => {
    return text.replaceAll(' ', '-').toLowerCase();
}

module.exports = e;
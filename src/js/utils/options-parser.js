const { modules } = require("../glizi");

const userOptionParser = {}

const operationFunction = {
    "=": (item, option) => {
        return (value) => value.toLowerCase() === item.toLowerCase() ? option : null;
    },
    "!=": (item, option) => {
        return (value) => value.toLowerCase() !== item.toLowerCase() ? option : null;
    },
    "~": (item, option) => {
        return (value) => value.toLowerCase().includes(item.toLowerCase()) ? option : null;
    },
    "!~": (item, option) => {
        return (value) => !value.toLowerCase().includes(item.toLowerCase()) ? option : null;
    }
}

const resolveOptionIntoOperation = (key, value) => {
    const keyName = key.split("{")[0]
    const itemOperation = key.split("{")[1].split("}")[0]
    const operation = (itemOperation.match(/(!{0,1}[~=])/) || "~")[0];
    const item = itemOperation.split(operation)[1];
    return {
        key: keyName,
        operation: operationFunction[operation](item, value),
        operationType: operation,
        item,
        value
    }
}

userOptionParser.parseOptions = (options) => {
    if(!options){
        return [];
    }

    return options.split(",").map((option) => {
        if(option.includes(":")){
            const splitOption = option.split(":");
            const key = splitOption[0];
            const value = splitOption[1];
            if(key.includes("{") && key.includes("}")){
                return resolveOptionIntoOperation(key, value);
            }
            return {key, value}
        }
        return option;
    });
}

module.exports = userOptionParser;
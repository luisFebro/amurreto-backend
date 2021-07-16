exports.pushFIFO = (field, elem) => {
    const fifo = { $each: [elem], $position: 0 }; // first in, first out.
    const finalFifo = { [field]: fifo };

    return { $push: finalFifo };
};

exports.popFIFO = (fieldArray) => {
    // n1
    return { $pop: { [fieldArray]: -1 } }; // n2
};

// n1: The $pop operator removes the first or last element of an array. Pass $pop a value of -1 to remove the first element of an array and 1 to remove the last element in an array.
// n2: if there is no element in the array, nothing happens

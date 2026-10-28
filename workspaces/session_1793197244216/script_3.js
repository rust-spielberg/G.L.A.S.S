// Original array (will be mutated in the buggy version)
let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Display original array
document.getElementById('original').textContent = numbers.join(', ');

// Buggy approach (commented out for reference)
/*
function removeEvensBuggy() {
    numbers.forEach((num, index) => {
        if (num % 2 === 0) {
            numbers.splice(index, 1); // Mutates array during iteration → skips elements
        }
    });
    document.getElementById('filtered').textContent = numbers.join(', ');
}
*/

// Corrected approach using filter (non-mutating)
function removeEvensFixed() {
    // Create a new array with only odd numbers
    const filtered = numbers.filter(num => num % 2 !== 0);
    // Update the display
    document.getElementById('filtered').textContent = filtered.join(', ');
    // Optionally update the original array reference (if needed elsewhere)
    numbers = filtered;
}

// Attach event listener to button
document.getElementById('filter-btn').addEventListener('click', removeEvensFixed);
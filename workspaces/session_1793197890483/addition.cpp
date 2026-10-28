#include <iostream>
#include <iomanip>

/**
 * Adds two numbers.
 * @param a First operand.
 * @param b Second operand.
 * @return Sum of a and b.
 */
double add(double a, double b) {
    return a + b;
}

int main() {
    double x = 5.5;
    double y = 3.2;
    double result = add(x, y);
    std::cout << std::fixed << std::setprecision(1);
    std::cout << x << " + " << y << " = " << result << std::endl;
    return 0;
}
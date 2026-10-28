#include <stdio.h>

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
    printf("%.1f + %.1f = %.1f\n", x, y, result);
    return 0;
}
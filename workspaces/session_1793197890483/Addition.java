public class Addition {
    /**
     * Adds two numbers.
     * @param a First operand.
     * @param b Second operand.
     * @return Sum of a and b.
     */
    public static double add(double a, double b) {
        return a + b;
    }

    public static void main(String[] args) {
        double x = 5.5;
        double y = 3.2;
        double result = add(x, y);
        System.out.printf("%.1f + %.1f = %.1f%n", x, y, result);
    }
}
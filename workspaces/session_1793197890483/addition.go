package main

import "fmt"

// add returns the sum of two float64 numbers.
func add(a, b float64) float64 {
	return a + b
}

func main() {
	x := 5.5
	y := 3.2
	result := add(x, y)
	fmt.Printf("%.1f + %.1f = %.1f\n", x, y, result)
}
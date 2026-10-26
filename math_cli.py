#!/usr/bin/env python3
import sys
import argparse

def add(a, b):
    return a + b

def subtract(a, b):
    return a - b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b

def main():
    parser = argparse.ArgumentParser(description="Simple CLI calculator")
    parser.add_argument("num1", type=float, help="First number")
    parser.add_argument("operator", choices=['+', '-', '*', '/'], help="Operator")
    parser.add_argument("num2", type=float, help="Second number")
    args = parser.parse_args()

    num1 = args.num1
    operator = args.operator
    num2 = args.num2

    if operator == '+':
        result = add(num1, num2)
    elif operator == '-':
        result = subtract(num1, num2)
    elif operator == '*':
        result = multiply(num1, num2)
    elif operator == '/':
        result = divide(num1, num2)

    print(f"{num1} {operator} {num2} = {result}")

if __name__ == "__main__":
    main()
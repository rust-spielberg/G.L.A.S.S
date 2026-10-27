# Python program to add 7 different numbers taken from the user

# Initialize the sum to zero
total_sum = 0

# Loop to take 7 numbers from the user
for i in range(7):
    number = float(input(f"Enter number {i+1}: "))
    total_sum += number

# Print the total sum
print(f"The sum of the 7 numbers is: {total_sum}")
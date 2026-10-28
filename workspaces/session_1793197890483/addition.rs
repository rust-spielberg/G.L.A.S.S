/// Adds two numbers.
fn add(a: f64, b: f64) -> f64 {
    a + b
}

fn main() {
    let x = 5.5;
    let y = 3.2;
    let result = add(x, y);
    println!("{:.1} + {:.1} = {:.1}", x, y, result);
}
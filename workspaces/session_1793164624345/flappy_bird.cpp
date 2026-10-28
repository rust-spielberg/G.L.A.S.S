// flappy_bird.cpp
#include <iostream>
#include <fstream>
#include <cstdlib>
#include <ctime>

struct Bird {
    int y;
    int velocity;
};

struct Pipe {
    int x;
    int height;
};

void updateGame(Bird& bird, Pipe& pipe, std::ofstream& outFile) {
    bird.velocity += 1; // Gravity
    bird.y += bird.velocity;

    if (bird.y <= 0 || bird.y >= 400) {
        outFile << "Game Over" << std::endl;
        return;
    }

    if (pipe.x <= 0 && pipe.x >= -50) {
        if (bird.y < pipe.height || bird.y > pipe.height + 100) {
            outFile << "Game Over" << std::endl;
            return;
        }
    }

    pipe.x -= 2;

    if (pipe.x <= -50) {
        pipe.x = 400;
        pipe.height = rand() % 300 + 100;
    }

    outFile << "Bird Y: " << bird.y << std::endl;
    outFile << "Pipe X: " << pipe.x << std::endl;
    outFile << "Pipe Height: " << pipe.height << std::endl;
}

int main() {
    srand(time(0));

    Bird bird = {200, 0};
    Pipe pipe = {400, rand() % 300 + 100};

    std::ofstream outFile("game_state.txt");

    while (true) {
        updateGame(bird, pipe, outFile);
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }

    outFile.close();
    return 0;
}
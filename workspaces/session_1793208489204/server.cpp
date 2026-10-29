#include <vector>
#include <algorithm>
#include <random>
#include <string>
#include "httplib.h"
#include "json.hpp"

using json = nlohmann::json;

int main() {
    httplib::Server svr;

    // Serve static files
    svr.set_mount_point("/", "./");

    // API to initialize game board
    svr.Get("/api/init", [&](const httplib::Request&, httplib::Response& res) {
        const int pairCount = 8; // 8 pairs => 16 cards
        std::vector<int> cards;
        for (int i = 0; i < pairCount; ++i) {
            cards.push_back(i);
            cards.push_back(i);
        }
        std::random_device rd;
        std::mt19937 g(rd());
        std::shuffle(cards.begin(), cards.end(), g);

        json j = cards;
        res.set_content(j.dump(), "application/json");
    });

    std::cout << "Server listening on http://0.0.0.0:8080\n";
    svr.listen("0.0.0.0", 8080);
    return 0;
}
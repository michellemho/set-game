from flask import Flask, jsonify, request, send_from_directory
import random
from itertools import combinations

app = Flask(__name__, static_folder='static')

# Card attributes
NUMBERS = [1, 2, 3]
COLORS = ['red', 'green', 'purple']
SHAPES = ['oval', 'squiggle', 'diamond']
SHADINGS = ['solid', 'striped', 'open']


def make_deck():
    deck = []
    for number in NUMBERS:
        for color in COLORS:
            for shape in SHAPES:
                for shading in SHADINGS:
                    deck.append({
                        'number': number,
                        'color': color,
                        'shape': shape,
                        'shading': shading
                    })
    random.shuffle(deck)
    return deck


def is_set(c1, c2, c3):
    for attr in ['number', 'color', 'shape', 'shading']:
        vals = {c1[attr], c2[attr], c3[attr]}
        if len(vals) == 2:
            return False
    return True


def find_set(cards):
    for combo in combinations(range(len(cards)), 3):
        i, j, k = combo
        if is_set(cards[i], cards[j], cards[k]):
            return list(combo)
    return None


# Game state (single-player, server-side)
game_state = {}


def new_game():
    deck = make_deck()
    board = deck[:12]
    remaining = deck[12:]
    return {
        'deck': remaining,
        'board': board,
        'score': 0,
        'game_over': False
    }


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/new_game', methods=['POST'])
def api_new_game():
    game_state.clear()
    game_state.update(new_game())
    # Check if there's a set on the initial board
    ensure_set_exists()
    return jsonify({
        'board': game_state['board'],
        'score': game_state['score'],
        'deck_remaining': len(game_state['deck']),
        'game_over': game_state['game_over']
    })


def ensure_set_exists():
    """If no set exists on board and deck has cards, deal 3 more. Repeat until set found or deck empty."""
    while not find_set(game_state['board']) and game_state['deck']:
        # Add 3 more cards
        for _ in range(3):
            if game_state['deck']:
                game_state['board'].append(game_state['deck'].pop(0))
    if not find_set(game_state['board']):
        game_state['game_over'] = True


@app.route('/api/submit_set', methods=['POST'])
def api_submit_set():
    data = request.json
    indices = data.get('indices', [])

    if len(indices) != 3:
        return jsonify({'valid': False, 'message': 'Select exactly 3 cards'})

    board = game_state['board']
    if any(i < 0 or i >= len(board) for i in indices):
        return jsonify({'valid': False, 'message': 'Invalid card indices'})

    c1, c2, c3 = board[indices[0]], board[indices[1]], board[indices[2]]

    if not is_set(c1, c2, c3):
        return jsonify({'valid': False, 'message': 'Not a Set!', 'score': game_state['score']})

    # Valid set — remove cards and replace from deck
    game_state['score'] += 1

    if len(board) == 12 and game_state['deck']:
        # Replace in-place so card positions stay stable
        for i in indices:
            board[i] = game_state['deck'].pop(0)
    else:
        # Board > 12 or deck empty — just remove the cards
        for i in sorted(indices, reverse=True):
            board.pop(i)

    ensure_set_exists()

    return jsonify({
        'valid': True,
        'message': 'Set!',
        'board': game_state['board'],
        'score': game_state['score'],
        'deck_remaining': len(game_state['deck']),
        'game_over': game_state['game_over']
    })


@app.route('/api/state', methods=['GET'])
def api_state():
    if not game_state:
        return jsonify({'game_over': True, 'score': 0, 'board': [], 'deck_remaining': 0})
    return jsonify({
        'board': game_state['board'],
        'score': game_state['score'],
        'deck_remaining': len(game_state['deck']),
        'game_over': game_state['game_over']
    })


if __name__ == '__main__':
    app.run(debug=True)

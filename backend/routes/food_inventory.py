from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db, get_company_db, get_user_company

food_bp = Blueprint('food', __name__)

def require_role(uid, *roles):
    db   = get_db()
    user = db.execute('SELECT role FROM users WHERE id=?', [uid]).fetchone()
    db.close()
    return user and user['role'] in roles

@food_bp.route('/', methods=['GET'])
@jwt_required()
def get_inventory():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    category = request.args.get('category')
    db       = get_company_db(company_id)
    if category:
        items = db.execute('SELECT * FROM food_inventory WHERE category=? ORDER BY item_name', [category]).fetchall()
    else:
        items = db.execute('SELECT * FROM food_inventory ORDER BY category, item_name').fetchall()
    db.close()
    return jsonify([dict(i) for i in items])

@food_bp.route('/low-stock', methods=['GET'])
@jwt_required()
def low_stock():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify([])
    db    = get_company_db(company_id)
    items = db.execute(
        'SELECT * FROM food_inventory WHERE quantity_in_stock <= min_quantity ORDER BY quantity_in_stock'
    ).fetchall()
    db.close()
    return jsonify([dict(i) for i in items])

@food_bp.route('/stats', methods=['GET'])
@jwt_required()
def stats():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'total_items': 0, 'low_stock_count': 0, 'stock_value': 0, 'by_category': []})
    db        = get_company_db(company_id)
    total     = db.execute('SELECT COUNT(*) as c FROM food_inventory').fetchone()['c']
    low_count = db.execute('SELECT COUNT(*) as c FROM food_inventory WHERE quantity_in_stock <= min_quantity').fetchone()['c']
    stock_val = db.execute('SELECT COALESCE(SUM(quantity_in_stock * unit_price),0) as v FROM food_inventory').fetchone()['v']
    by_cat    = db.execute('SELECT category, COUNT(*) as count FROM food_inventory GROUP BY category').fetchall()
    db.close()
    return jsonify({'total_items': total, 'low_stock_count': low_count,
                    'stock_value': round(stock_val, 2), 'by_category': [dict(c) for c in by_cat]})

@food_bp.route('/', methods=['POST'])
@jwt_required()
def create_item():
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data = request.get_json()
    if not data.get('item_name'):
        return jsonify({'error': 'item_name required'}), 400
    db  = get_company_db(company_id)
    cur = db.execute(
        'INSERT INTO food_inventory (item_name,category,unit,quantity_in_stock,min_quantity,unit_price,last_purchased_date,supplier) VALUES (?,?,?,?,?,?,?,?)',
        [data['item_name'], data.get('category','grocery'), data.get('unit','kg'),
         data.get('quantity_in_stock',0), data.get('min_quantity',0), data.get('unit_price',0),
         data.get('last_purchased_date',''), data.get('supplier','')]
    )
    db.commit()
    item = db.execute('SELECT * FROM food_inventory WHERE id=?', [cur.lastrowid]).fetchone()
    db.close()
    return jsonify(dict(item)), 201

@food_bp.route('/<int:iid>', methods=['PUT'])
@jwt_required()
def update_item(iid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    data    = request.get_json()
    db      = get_company_db(company_id)
    fields  = ['item_name','category','unit','quantity_in_stock','min_quantity','unit_price','last_purchased_date','supplier']
    updates = {f: data[f] for f in fields if f in data}
    if updates:
        sets = ', '.join(f'{k}=?' for k in updates)
        db.execute(f'UPDATE food_inventory SET {sets} WHERE id=?', list(updates.values()) + [iid])
        db.commit()
    item = db.execute('SELECT * FROM food_inventory WHERE id=?', [iid]).fetchone()
    db.close()
    if not item:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(item))

@food_bp.route('/<int:iid>', methods=['DELETE'])
@jwt_required()
def delete_item(iid):
    uid = int(get_jwt_identity())
    if not require_role(uid, 'super_admin', 'owner'):
        return jsonify({'error': 'Forbidden'}), 403
    role, company_id = get_user_company(uid)
    if not company_id:
        return jsonify({'error': 'No company assigned'}), 400
    db = get_company_db(company_id)
    db.execute('DELETE FROM food_inventory WHERE id=?', [iid])
    db.commit()
    db.close()
    return jsonify({'message': 'Deleted'})

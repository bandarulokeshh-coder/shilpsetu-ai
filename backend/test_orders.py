"""End-to-end smoke test for the orders API."""
import json
import urllib.request
import urllib.error

BASE = 'http://localhost:3001'


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8-sig'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8-sig'))


def login(email):
    status, data = call('POST', '/api/auth/login', body={'email': email, 'password': 'demo123'})
    assert status == 200, f'login {email} failed: {status} {data}'
    return data['token']


def check(label, cond, detail=''):
    print(('PASS' if cond else 'FAIL'), label, detail)
    if not cond:
        raise SystemExit(f'FAILED: {label}')


buyer = login('buyer@demo.com')
artisan = login('artisan@demo.com')

# Find an approved product
status, products = call('GET', '/api/products')
approved = [p for p in products if p['status'] == 'APPROVED']
check('approved products exist', len(approved) > 0)
product = approved[0]
print('  product:', product['id'], product['title'][:40], 'price=', product.get('suggestedPrice'), 'artisan=', product['artisanId'])

# Validation: empty cart
status, data = call('POST', '/api/orders', token=buyer, body={'items': [], 'shipping': {}})
check('empty cart -> 400', status == 400, str(data))

# Validation: incomplete shipping
status, data = call('POST', '/api/orders', token=buyer, body={'items': [{'productId': product['id'], 'quantity': 1}], 'shipping': {'name': 'X'}})
check('incomplete shipping -> 400', status == 400, str(data))

# Place an order
shipping = {'name': 'Rajesh Kumar', 'phone': '+91-9876543211', 'address': '12, Crafts Lane', 'city': 'Jaipur', 'pincode': '302001'}
status, order = call('POST', '/api/orders', token=buyer, body={
    'items': [{'productId': product['id'], 'quantity': 2}],
    'shipping': shipping,
})
expected_total = (product.get('suggestedPrice') or 0) * 2
check('place order -> 201', status == 201, str(order.get('error', '')))
check('server-side total correct', abs(order['totalAmount'] - expected_total) < 0.01, f"got {order['totalAmount']} want {expected_total}")
check('order starts PENDING', order['status'] == 'PENDING')
check('item snapshot present', order['items'][0]['title'] == product['title'] and order['items'][0]['unitPrice'] == (product.get('suggestedPrice') or 0))
order_id = order['id']

# Buyer lists orders
status, orders = call('GET', '/api/orders', token=buyer)
check('buyer sees own order', status == 200 and any(o['id'] == order_id for o in orders))

# Buyer cannot change status
status, data = call('PATCH', f'/api/orders/{order_id}/status', token=buyer, body={'status': 'SHIPPED'})
check('buyer status change -> 403', status == 403, str(data))

# Invalid status
status, data = call('PATCH', f'/api/orders/{order_id}/status', token=artisan, body={'status': 'WHATEVER'})
check('invalid status -> 400', status == 400, str(data))

# Artisan advances tracking
for new_status in ['CONFIRMED', 'SHIPPED', 'DELIVERED']:
    status, updated = call('PATCH', f'/api/orders/{order_id}/status', token=artisan, body={'status': new_status})
    check(f'artisan -> {new_status}', status == 200 and updated['status'] == new_status, str(updated.get('error', '')))

# Artisan sees orders for their products
status, orders = call('GET', '/api/orders', token=artisan)
check('artisan sees order', status == 200 and any(o['id'] == order_id for o in orders))

# Get single order as owner
status, fetched = call('GET', f'/api/orders/{order_id}', token=buyer)
check('buyer fetch own order', status == 200 and fetched['id'] == order_id)

# Place a second order and cancel it while PENDING
status, order2 = call('POST', '/api/orders', token=buyer, body={
    'items': [{'productId': product['id'], 'quantity': 1}],
    'shipping': shipping,
})
check('second order placed', status == 201)
status, cancelled = call('PATCH', f"/api/orders/{order2['id']}/cancel", token=buyer)
check('cancel pending order', status == 200 and cancelled['status'] == 'CANCELLED', str(cancelled.get('error', '')))
status, data = call('PATCH', f"/api/orders/{order2['id']}/cancel", token=buyer)
check('cancel again -> 400', status == 400, str(data))

# Unauthenticated access
status, data = call('GET', '/api/orders')
check('no token -> 401', status == 401, str(data))

print('\nALL ORDERS API TESTS PASSED')

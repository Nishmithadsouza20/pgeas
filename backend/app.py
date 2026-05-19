from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'pgease_secret')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'pgease_jwt')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400

CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
jwt = JWTManager(app)

from routes.auth            import auth_bp
from routes.rooms           import rooms_bp
from routes.residents       import residents_bp
from routes.payments        import payments_bp
from routes.complaints      import complaints_bp
from routes.notices         import notices_bp
from routes.mess            import mess_bp
from routes.visitors        import visitors_bp
from routes.analytics       import analytics_bp
from routes.companies       import companies_bp
from routes.staff           import staff_bp
from routes.expenses        import expenses_bp
from routes.food_inventory  import food_bp
from routes.attendance      import attendance_bp
from routes.payroll         import payroll_bp
from routes.maintenance     import maintenance_bp
from routes.gatepass        import gatepass_bp
from routes.invoices        import invoices_bp
from routes.utilities       import utilities_bp
from routes.deposits        import deposits_bp
from routes.reports         import reports_bp
from routes.enquiries       import enquiries_bp
from routes.notifications_api import notif_bp
from routes.meals           import meals_bp

app.register_blueprint(auth_bp,         url_prefix='/api/auth')
app.register_blueprint(rooms_bp,        url_prefix='/api/rooms')
app.register_blueprint(residents_bp,    url_prefix='/api/residents')
app.register_blueprint(payments_bp,     url_prefix='/api/payments')
app.register_blueprint(complaints_bp,   url_prefix='/api/complaints')
app.register_blueprint(notices_bp,      url_prefix='/api/notices')
app.register_blueprint(mess_bp,         url_prefix='/api/mess')
app.register_blueprint(visitors_bp,     url_prefix='/api/visitors')
app.register_blueprint(analytics_bp,    url_prefix='/api/analytics')
app.register_blueprint(companies_bp,    url_prefix='/api/companies')
app.register_blueprint(staff_bp,        url_prefix='/api/staff')
app.register_blueprint(expenses_bp,     url_prefix='/api/expenses')
app.register_blueprint(food_bp,         url_prefix='/api/food')
app.register_blueprint(attendance_bp,   url_prefix='/api/attendance')
app.register_blueprint(payroll_bp,      url_prefix='/api/payroll')
app.register_blueprint(maintenance_bp,  url_prefix='/api/maintenance')
app.register_blueprint(gatepass_bp,     url_prefix='/api/gatepass')
app.register_blueprint(invoices_bp,     url_prefix='/api/invoices')
app.register_blueprint(utilities_bp,    url_prefix='/api/utilities')
app.register_blueprint(deposits_bp,     url_prefix='/api/deposits')
app.register_blueprint(reports_bp,      url_prefix='/api/reports')
app.register_blueprint(enquiries_bp,    url_prefix='/api/enquiries')
app.register_blueprint(notif_bp,        url_prefix='/api/notifications')
app.register_blueprint(meals_bp,        url_prefix='/api/meals')

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'message': 'PGease API running'})

if __name__ == '__main__':
    from database import init_db
    init_db()
    print("[PGease] Backend running on http://localhost:5000")
    # use_reloader=False prevents Werkzeug from spawning a second process that
    # would race for the same SQLite database file and cause "database is locked".
    app.run(debug=True, port=5000, use_reloader=False)

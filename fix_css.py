import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace viewport
content = re.sub(r'<meta name="viewport" content="width=device-width, initial-scale=1.0">',
                 '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
                 content)

# Replace style block
new_css = """<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f0f2f5;
    margin: 0;
    padding: 20px 0;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: 100vh;
    background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('https://png.pngtree.com/background/20230528/original/pngtree-food-spread-on-the-table-picture-image_2782704.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }
  
  .container {
    width: 95%; max-width: 700px;
    background: rgba(255, 255, 255, 0.98);
    padding: 30px; border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    margin: 20px auto;
  }
  
  h2 { font-size: 28px; margin-bottom: 20px; color: #2c3e50; text-align: center; font-weight: 700; }
  h3 { font-size: 22px; margin-bottom: 15px; color: #34495e; font-weight: 600; }
  p { font-size: 16px; color: #555; margin-bottom: 20px; text-align: center; line-height: 1.6; }
  
  .form-step { display: none; opacity: 0; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateX(20px); }
  .form-step.active { display: block; opacity: 1; transform: translateX(0); }
  
  .form-group { margin-bottom: 20px; width: 100%; }
  label { display: block; font-size: 15px; font-weight: 600; color: #444; margin-bottom: 8px; text-align: left; }
  
  input, textarea, select {
    width: 100%; padding: 14px 16px; border: 2px solid #e1e8ed; border-radius: 8px;
    font-size: 16px; color: #333; background-color: #f8f9fa; transition: all 0.3s;
  }
  input:focus, textarea:focus, select:focus {
    border-color: #4CAF50; outline: none; background-color: #fff; box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
  }
  
  .buttons { display: flex; justify-content: space-between; margin-top: 30px; gap: 15px; }
  button { padding: 12px 24px; font-size: 16px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; flex: 1; }
  button:active { transform: scale(0.98); }
  .btn-next { background-color: #4CAF50; color: white; }
  .btn-next:hover { background-color: #45a049; }
  .btn-back { background-color: #95a5a6; color: white; }
  .btn-back:hover { background-color: #7f8c8d; }
  .btn-submit { background-color: #e74c3c; color: white; width: 100%; margin-top: 20px; padding: 15px; font-size: 18px; }
  .btn-submit:hover { background-color: #c0392b; }
  .btn-cart { background-color: #2196F3; color: white; margin-bottom: 20px; width: 100%; }
  .btn-cart:hover { background-color: #1976D2; }
  
  .options, .categories { display: flex; gap: 15px; justify-content: center; margin-bottom: 30px; flex-wrap: wrap; }
  .option, .category { padding: 12px 20px; border: 2px solid #3498db; border-radius: 30px; cursor: pointer; text-align: center; font-size: 15px; font-weight: 600; color: #3498db; background: white; transition: all 0.2s; }
  .option:hover, .category:hover, .option.selected, .category.selected { background-color: #3498db; color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3); }
  
  .restaurants, .slideshow { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
  .restaurant-card { border: 1px solid #eee; border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; background: white; transition: all 0.2s; }
  .restaurant-card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-color: #3498db; }
  .restaurant-card img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; }
  .restaurant-card h4 { font-size: 18px; margin-bottom: 8px; color: #333; }
  .restaurant-card p { font-size: 14px; margin-bottom: 0; color: #666; }
  
  .menu-list { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
  .menu-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #eee; border-radius: 12px; background: white; }
  .menu-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .menu-item span { font-size: 16px; font-weight: 600; color: #333; display: block; margin-bottom: 5px; }
  .menu-item small { font-size: 14px; color: #e74c3c; font-weight: bold; }
  .add-to-cart { background-color: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 0; margin-left: 10px; }
  
  #cartItems { margin-bottom: 20px; max-height: 250px; overflow-y: auto; }
  .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
  .cart-item button { padding: 4px 10px; font-size: 12px; margin-left: 10px; background: #e74c3c; color: white; border-radius: 4px; }
  #cartTotal { font-size: 20px; font-weight: bold; text-align: right; color: #2c3e50; padding-top: 15px; border-top: 2px solid #eee; }
  
  #qrScanner { text-align: center; margin-bottom: 20px; }
  #qrScanner img { max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  
  .spinner { display: none; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  
  .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); backdrop-filter: blur(4px); }
  .modal-content, .cart-modal-content { background-color: #fff; margin: 10% auto; padding: 30px; border-radius: 16px; width: 90%; max-width: 500px; position: relative; }
  .close { position: absolute; right: 20px; top: 15px; color: #aaa; font-size: 28px; font-weight: bold; cursor: pointer; }
  .close:hover { color: #333; }
  
  .success-message { background-color: #e8f5e9; color: #2e7d32; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; border-left: 5px solid #4CAF50; }
  
  @media (max-width: 600px) {
    .container { padding: 20px; margin: 10px auto; border-radius: 12px; }
    .buttons { flex-direction: column; }
    .btn-next, .btn-back { width: 100%; }
  }
</style>"""

content = re.sub(r'<style>.*?</style>', new_css, content, flags=re.DOTALL)

# Fix the inline styles in tableNumberPage
content = content.replace(
    '<div id="tableNumberPage" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #f8f9fa; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 1000;">',
    '<div id="tableNumberPage" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #f0f2f5; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 1000; padding: 20px; box-sizing: border-box;">'
)
content = content.replace(
    '<h1 style="font-size:3vh; margin-bottom: 20px;">Welcome! Please Enter Your Table Number</h1>',
    '<h1 style="font-size:24px; margin-bottom: 20px; color: #2c3e50; text-align: center;">Welcome! Please Enter Your Table Number</h1>'
)
content = content.replace(
    '<input type="number" id="tableInput" placeholder="Enter table number" min="1" max="20" style="padding: 15px; font-size:3vh; margin: 15px 0; width: 250px; border: 1px solid #ddd; border-radius: 5px;">',
    '<input type="number" id="tableInput" placeholder="Enter table number" min="1" max="20" style="padding: 14px; font-size:16px; margin: 15px 0; width: 100%; max-width: 300px; border: 2px solid #e1e8ed; border-radius: 8px; text-align: center; box-sizing: border-box;">'
)
content = content.replace(
    '<button onclick="submitTable()" style="padding: 15px 30px; font-size:3vh; background-color: #28a745; color: white; border: none; cursor: pointer; border-radius: 5px;">Submit</button>',
    '<button onclick="submitTable()" style="padding: 14px 30px; font-size:16px; background-color: #4CAF50; color: white; border: none; cursor: pointer; border-radius: 8px; font-weight: bold; width: 100%; max-width: 300px;">Submit</button>'
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

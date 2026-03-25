import traceback
try:
    import main
except Exception as e:
    with open("full_error.txt", "w") as f:
        f.write(traceback.format_exc())

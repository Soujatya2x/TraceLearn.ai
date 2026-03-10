import subprocess
import sys
import os
import datetime

LOG_DIR = "logs"

def run_script(script_name):
    os.makedirs(LOG_DIR, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_file = os.path.join(LOG_DIR, f"{script_name}_{timestamp}.log")

    with open(log_file, "w") as f:
        f.write(f"Running script: {script_name}\n")
        f.write(f"Start time: {datetime.datetime.now()}\n\n")

        process = subprocess.Popen(
            ["python", script_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout, stderr = process.communicate()

        f.write("=== STDOUT ===\n")
        f.write(stdout + "\n")

        f.write("\n=== STDERR ===\n")
        f.write(stderr + "\n")

        f.write(f"\nExit Code: {process.returncode}")
        f.write(f"\nEnd time: {datetime.datetime.now()}")

    print(f"Log saved to: {log_file}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_with_logs.py script.py")
        sys.exit(1)

    script = sys.argv[1]
    run_script(script)
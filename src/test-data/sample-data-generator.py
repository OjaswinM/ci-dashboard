import json
import random
from datetime import datetime

def generate_random_test_entries(num_tests=1000):
    statuses = ["pass", "fail", "skip"]
    tests = []

    for i in range(num_tests):
        test = {
            "name": f"generic/{i:03}",
            "status": random.choice(statuses),
            "duration": round(random.uniform(0, 20), 1),
            "log": None
        }
        if random.choice([True, False]):
            test.pop("log")
        tests.append(test)

    return tests

def generate_random_data(num_tests=1000):
    current_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    data = {
        "test_types": [
            {
                "type": "xfstests",
                "subtype": {
                    "name": "quick",
                    "runs": [
                        {
                            "run_id": current_time,
                            "tests": generate_random_test_entries(num_tests),
                            "environment": {
                                "vmlinux_path": None,
                                "config_path": None,
                                "distro": "ubuntu-22.04",
                                "kernel_release": "5.15.0-generic"
                            }
                        }
                    ]
                }
            }
        ]
    }
    return data

# Generate the data with 1000 random test entries
random_data = generate_random_data(1000)

# Output as formatted JSON
print(json.dumps(random_data, indent=2))


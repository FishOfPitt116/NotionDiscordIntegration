// function which returns a list of updates that have occurred on the new database since the old database
export function findUpdates(oldDatabase, newDatabase) {

    if (oldDatabase == newDatabase) {
        return [];
    }

    if (oldDatabase == undefined && newDatabase != undefined) {
        return [
            {
                "update": "db initialized locally",
                "task": undefined
            }
        ];
    }

    if (oldDatabase != undefined && newDatabase == undefined) {
        return [
            {
                "update": "db cleared locally",
                "task": undefined
            }
        ];
    }

    let updates = [];
    for (let [id, oldTask] of oldDatabase) {
        if (!newDatabase.has(id)) {
            updates.push(
                {
                    "update": "removed",
                    "task": oldTask
                }
            );
            continue;
        }
        let newTask = newDatabase.get(id);
        if (oldTask.Status != newTask.Status) {
            updates.push(
                {
                    "update": "status",
                    "task": newTask
                }
            )
        }
        if (oldTask.Priority != newTask.Priority) {
            updates.push(
                {
                    "update": "priority",
                    "task": newTask
                }
            )
        }
        if (oldTask["Due Date"] != newTask["Due Date"]) {
            updates.push(
                {
                    "update": "due date",
                    "task": newTask
                }
            )
        }
    }
    for (let [id, newTask] of newDatabase) {
        if (!oldDatabase.has(id)) {
            updates.push(
                {
                    "update": "created",
                    "task": newTask
                }
            );
        }
    }
    return updates;
}
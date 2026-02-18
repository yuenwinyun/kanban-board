import { test, expect } from '@playwright/test';

test.describe('Kanban Board E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add a task to todo column', async ({ page }) => {
    const todoColumn = page.locator('[data-col="todo"]');
    await todoColumn.locator('.add-btn').click();
    
    const input = todoColumn.locator('input');
    await input.fill('Test task 1');
    await input.press('Enter');
    
    await expect(todoColumn.locator('.card-text')).toContainText('Test task 1');
  });

  test('should add tasks to different columns', async ({ page }) => {
    // Add to todo
    const todoColumn = page.locator('[data-col="todo"]');
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Todo task');
    await todoColumn.locator('input').press('Enter');
    
    // Add to progress
    const progressColumn = page.locator('[data-col="progress"]');
    await progressColumn.locator('.add-btn').click();
    await progressColumn.locator('input').fill('Progress task');
    await progressColumn.locator('input').press('Enter');
    
    // Add to done
    const doneColumn = page.locator('[data-col="done"]');
    await doneColumn.locator('.add-btn').click();
    await doneColumn.locator('input').fill('Done task');
    await doneColumn.locator('input').press('Enter');
    
    await expect(todoColumn.locator('.card-text')).toContainText('Todo task');
    await expect(progressColumn.locator('.card-text')).toContainText('Progress task');
    await expect(doneColumn.locator('.card-text')).toContainText('Done task');
  });

  test('should delete a task', async ({ page }) => {
    const todoColumn = page.locator('[data-col="todo"]');
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Task to delete');
    await todoColumn.locator('input').press('Enter');
    
    const card = todoColumn.locator('.card-text');
    await expect(card).toContainText('Task to delete');
    
    await todoColumn.locator('.delete-btn').click();
    
    await expect(card).not.toBeVisible();
  });

  test('should update a task (delete old, add new)', async ({ page }) => {
    const todoColumn = page.locator('[data-col="todo"]');
    
    // Add original task
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Original task');
    await todoColumn.locator('input').press('Enter');
    
    // Delete it
    await todoColumn.locator('.delete-btn').click();
    
    // Add updated task
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Updated task');
    await todoColumn.locator('input').press('Enter');
    
    await expect(todoColumn.locator('.card-text')).toContainText('Updated task');
    await expect(todoColumn.locator('.card-text')).not.toContainText('Original task');
  });

  test('should drag and drop task between columns', async ({ page }) => {
    const todoColumn = page.locator('[data-col="todo"]');
    const progressColumn = page.locator('[data-col="progress"]');
    
    // Add task to todo
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Drag me');
    await todoColumn.locator('input').press('Enter');
    
    // Verify it's in todo
    await expect(todoColumn.locator('.card-text')).toContainText('Drag me');
    await expect(progressColumn.locator('.card-text')).not.toContainText('Drag me');
    
    // Drag task to progress
    const card = todoColumn.locator('.card').first();
    const targetColumn = progressColumn.locator('.task-list');
    
    await card.dragTo(targetColumn);
    
    // Verify it's now in progress
    await expect(progressColumn.locator('.card-text')).toContainText('Drag me');
    await expect(todoColumn.locator('.card-text')).not.toContainText('Drag me');
  });

  test('should reorder tasks within same column', async ({ page }) => {
    const todoColumn = page.locator('[data-col="todo"]');
    
    // Add two tasks
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Task A');
    await todoColumn.locator('input').press('Enter');
    
    await todoColumn.locator('.add-btn').click();
    await todoColumn.locator('input').fill('Task B');
    await todoColumn.locator('input').press('Enter');
    
    const cards = todoColumn.locator('.card');
    await expect(cards.first()).toContainText('Task A');
    await expect(cards.last()).toContainText('Task B');
    
    // Drag first task to end
    const firstCard = cards.first();
    const lastCardPosition = await cards.last().boundingBox();
    
    if (lastCardPosition) {
      await firstCard.dragTo(todoColumn.locator('.task-list'), {
        targetPosition: { x: lastCardPosition.x, y: lastCardPosition.y + 50 },
      });
    }
  });
});
